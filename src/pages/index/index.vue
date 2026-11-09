<template>
  <!-- 注意：uniapp 里没有 div/h1/p，全部换成 view/text 这些内置组件，
       这是为了让同一份代码能编译成小程序/App/H5 三端 -->
  <view class="page">
    <view class="header">
      <text class="title">Fleet 服务状态</text>
      <text class="sub" v-if="loaded && !error">
        共 {{ services.length }} 个服务 · 来自 {{ reporter }} · 下拉刷新
      </text>
    </view>

    <view v-if="!loaded" class="state">
      <text>正在读取服务…</text>
    </view>

    <view v-else-if="error" class="state bad">
      <text>{{ error }}</text>
      <button size="mini" @click="login">重新登录</button>
    </view>

    <view v-else>
      <!-- v-for 和 Vue 网页版语法完全一致：UniApp = Vue 语法平移 -->
      <view class="card" :class="tone(s)" v-for="s in services" :key="s.id">
        <text class="name">{{ s.name }} :{{ s.port }}</text>
        <text class="info">{{ levelText(s.level) }} · 来自 {{ s.note }}</text>
      </view>
    </view>
  </view>
</template>

<script>
// 概念页：UniApp 不用 fetch，用自家请求 API——同一份代码在
// H5 走 XHR、在微信小程序走 wx.request，这就是「跨端」的含义。
// 条件编译一码两用：H5 同源走 Vite 代理，小程序直连云端 Spring。
// #ifdef H5
const API_BASE = '' // 同源，交给 Vite 代理
// #endif
// #ifndef H5
const API_BASE = 'http://localhost:8090' // 小程序/App 直连云端 Spring
// #endif

// 全家桶版：数据源换成 Spring /api/report 汇聚的多机数据。
// 登录逻辑抽成 login()：拿 JWT 存本地，之后每个请求带 Bearer。
export default {
  data() {
    return {
      loaded: false,
      error: '',
      services: [],
      reporter: '',
      token: uni.getStorageSync('token') || '',
    }
  },
  onLoad() {
    if (this.token) {
      this.load()
    } else {
      this.login()
    }
  },
  onPullDownRefresh() {
    this.load().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    // 登录：教学版固定 admin/admin123，真实项目换成账号密码页
    login() {
      uni.request({
        url: API_BASE + '/api/login',
        method: 'POST',
        data: { username: 'admin', password: 'admin123' },
        timeout: 8000,
        success: (res) => {
          if (res.statusCode === 200 && res.data.token) {
            this.token = res.data.token
            uni.setStorageSync('token', this.token)
            this.load()
          } else {
            this.error = '登录失败：HTTP ' + res.statusCode
            this.loaded = true
          }
        },
        fail: (err) => {
          this.error = '登录连不上云端：' + (err.errMsg || '')
          this.loaded = true
        },
      })
    },
    async load() {
      try {
        // uni.request 返回类型跨端不一致，包一层 Promise 才能安全 await
        const result = await new Promise((resolve) => {
          uni.request({
            url: API_BASE + '/api/services',
            timeout: 8000,
            header: { Authorization: 'Bearer ' + this.token },
            success: (res) => resolve([null, res]),
            fail: (err) => resolve([err, null]),
          })
        })
        const [err, res] = result
        if (err) throw err
        if (res.statusCode === 401) {
          // token 过期：重新登录一轮
          this.loaded = false
          this.login()
          return
        }
        if (res.statusCode !== 200) throw new Error('HTTP ' + res.statusCode)
        const rows = res.data || []
        this.services = rows
        this.reporter = rows.length ? [...new Set(rows.map((r) => r.note))].join(' / ') : '云端'
        this.error = ''
      } catch (e) {
        this.error = '读取失败：' + (e.errMsg || e.message || '')
      } finally {
        this.loaded = true
      }
    },
    levelText(l) {
      if (l >= 4) return '正常 L4'
      if (l >= 3) return '部分正常 L3'
      if (l >= 1) return '仅存活 L1-L2'
      return '未通过 L0'
    },
    tone(s) {
      if ((s.level || 0) >= 4) return 'ok'
      if ((s.level || 0) >= 3) return 'warn'
      return 'bad'
    },
  },
}
</script>

<style>
.page { padding: 20rpx; }
.header { padding: 10rpx 0 20rpx; }
.title { font-size: 40rpx; font-weight: bold; }
.sub { font-size: 24rpx; color: #888; display: block; margin-top: 6rpx; }
.state { padding: 60rpx 20rpx; text-align: center; color: #888; }
.state.bad { color: #c0392b; }
/* rpx 是 uniapp 的响应式单位：750rpx = 屏幕宽度，自动适配不同手机 */
.card {
  background: #fff;
  border: 1rpx solid #eee;
  border-left-width: 8rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.card.ok   { border-left-color: #27ae60; }
.card.warn { border-left-color: #f39c12; }
.card.bad  { border-left-color: #c0392b; }
.name { font-size: 30rpx; font-weight: 600; display: block; }
.info { font-size: 24rpx; color: #666; margin-top: 8rpx; display: block; }
button { margin-top: 20rpx; }
</style>
