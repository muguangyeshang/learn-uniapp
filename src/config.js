// 云端地址：H5 走 Vite 同源代理（/api），小程序/App 直连 Spring。
//
// 为什么默认值是局域网 IP 而不是 localhost：小程序运行在手机/模拟器里，
// localhost 指向设备自身，永远连不到开发机。192.168.1.3 是本机实测的
// 局域网地址，配合微信开发者工具「不校验合法域名」即可直连 8090。
//
// 换环境不用改代码，在 learn-uniapp 根目录建 .env：
//   VITE_API_BASE=https://your-domain.com
// 微信正式环境必须 https + 已备案的合法域名，并在 manifest.json 的
// mp-weixin.appid 填入客户自己的 AppID，否则无法真机预览或上传。
// #ifdef H5
const API_BASE = ''
// #endif
// #ifndef H5
const API_BASE = import.meta.env.VITE_API_BASE || 'http://192.168.1.3:8090'
// #endif

export { API_BASE }
