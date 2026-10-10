// 自考刷题平台 Service Worker
// 策略：index.html 用 stale-while-revalidate（先给缓存秒开、后台拉新）；
// 图标/清单等静态资源 cache-first + 回源填充。离线时全部走缓存。
var CACHE='zk-cache-v1';

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll([
      './',
      './index.html',
      './icon-512.png',
      './apple-touch-icon-180.png',
      './manifest.webmanifest'
    ]);
  }).catch(function(){}));
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET') return;
  var u=new URL(req.url);
  if(u.origin!==self.location.origin) return;
  var path=u.pathname;
  var isPage=(path==='/'||path.indexOf('index.html')>=0);
  if(isPage){
    // stale-while-revalidate：先回缓存秒开，后台更新缓存
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(req).then(function(cached){
          var fetchP=fetch(req).then(function(net){
            if(net&&net.ok) c.put(req,net.clone());
            return net;
          }).catch(function(){ return cached; });
          return cached||fetchP;
        });
      })
    );
    return;
  }
  if(/\.(png|jpg|jpeg|svg|ico|webmanifest)$/.test(path)){
    // 静态资源：缓存优先，缺失时回源并填充
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(req).then(function(hit){
          if(hit) return hit;
          return fetch(req).then(function(net){
            if(net&&net.ok) c.put(req,net.clone());
            return net;
          });
        });
      })
    );
  }
});
