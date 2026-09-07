const CACHE_NAME = 'metro-isfahan-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './schedule.json',
    './manifest.json'
];

// نصب سرویس ورکر و کش کردن فایل‌های اولیه
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// فعال‌سازی و حذف کش‌های قدیمی
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// استراتژی Fetch: ابتدا شبکه، در صورت قطعی اینترنت استفاده از کش (Network First)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // اگر درخواست موفق بود، نسخه جدید را در کش به روز می‌کنیم
                if (event.request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // در صورت قطع بودن اینترنت، از نسخه کش‌شده استفاده کن
                return caches.match(event.request);
            })
    );
});