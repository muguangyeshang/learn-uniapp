// 全家桶统一请求层：登录、带票、401 静默重登。
// index（服务看板）/ book（预约表单）/ orders（后台数据页）共用这一份，
// 避免三处各写一套登录逻辑导致 token 状态不一致。
//
// 地址统一由 src/config.js 提供（可用 .env 的 VITE_API_BASE 覆盖），
// 避免每加一个页面就复制一份写死的 localhost。
import { API_BASE } from '../config.js'

// 教学版固定账号；接真实系统时换成登录页，把凭据交给用户填写。
// 后端对应 application.properties 的 fleet.admin-user / fleet.admin-password。
const DEMO_USER = { username: 'admin', password: 'admin123' }
const TOKEN_KEY = 'token'

export { API_BASE }

export function readToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function clearToken() {
  uni.removeStorageSync(TOKEN_KEY)
}

// uni.request 跨端返回类型不一致，统一包成 { ok, status, data, error }
function raw(method, path, data, token) {
  return new Promise((resolve) => {
    uni.request({
      url: API_BASE + path,
      method,
      data,
      timeout: 8000,
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {}
      ),
      success: (res) => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        data: res.data,
      }),
      fail: (err) => resolve({ ok: false, status: 0, data: null, error: err.errMsg || 'network error' }),
    })
  })
}

export async function login() {
  const r = await raw('POST', '/api/login', DEMO_USER, '')
  if (!r.ok || !r.data || !r.data.token) {
    throw new Error('登录失败：HTTP ' + r.status)
  }
  uni.setStorageSync(TOKEN_KEY, r.data.token)
  return r.data.token
}

/**
 * 统一出口。401 时丢掉旧 token、重登一次后重试同一请求；
 * 非 2xx 抛出后端 error 字段，页面直接显示给人看。
 */
export async function api(method, path, data, retried = false) {
  let token = readToken()
  if (!token) token = await login()
  const r = await raw(method, path, data, token)
  if (r.status === 401 && !retried) {
    clearToken()
    await login()
    return api(method, path, data, true)
  }
  if (!r.ok) {
    const msg = (r.data && r.data.error) || r.error || ('HTTP ' + r.status)
    throw new Error(msg)
  }
  return r.data
}
