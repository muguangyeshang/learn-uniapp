<template>
  <!-- 注意：uniapp 里没有 div/h1/p，全部换成 view/text 这些内置组件，
       这是为了让同一份代码能编译成小程序/App/H5 三端 -->
  <view class="page">
    <view class="header">
      <text class="title">Fleet 服务状态</text>
      <text class="sub" v-if="loaded && !error">
        共 {{ overview.total }} 个 · 正常 {{ overview.healthy }} · 下拉刷新
      </text>
    </view>

    <view v-if="!loaded" class="state">
      <text>正在读取服务…</text>
    </view>

    <view v-else-if="error" class="state bad">
      <text>{{ error }}</text>
      <button size="mini" @click="load">重试</button>
    </view>

    <view v-else>
      <!-- v-for 和 Vue 网页版语法完全一致：UniApp = Vue 语法平移 -->
      <view class="card" :class="tone(s)" v-for="s in services" :key="s.key">
        <text class="name">{{ s.name }} :{{ s.port }}</text>
        <text class="info">{{ levelText(s.level_number) }} · 心跳 {{ s.heartbeat || '-' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
// 概念页：UniApp 不用 fetch，用自家请求 API——同一份代码在
// H5 走 XHR、在微信小程序走 wx.request，这就是「跨端」的含义。
// H5 端走同源 '/api'（由 Vite 代理转发），小程序端不受 CORS
// 限制但要写完整地址——用条件编译一码两用：
// #ifdef H5
const API_BASE = '' // 同源，交给 Vite 代理
// #endif
// #ifndef H5
const API_BASE = 'http://127.0.0.1:8799' // 小程序/App 直连面板
// #endif

export default {
  data() {
    return {
      loaded: false,
      error: '',
      services: [],
      overview: { total: 0, healthy: 0 },
    }
  },
  // onLoad 是 uniapp 的页面生命周期（对应网页版 onMounted）
  onLoad() {
    this.load()
  },
  // 下拉刷新：用户下拉时触发，load 完成后收起刷新动画
  onPullDownRefresh() {
    this.load().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    async load() {
      try {
        // uni.request：跨端请求原语，同一份代码 H5 走 XHR、小程序走 wx.request。
        // 注意：uni.request 在不同版本/端上有的返回 Promise、有的只走回调，
        // 包一层 Promise 才能安全地 await——「(intermediate value) is not
        // iterable」就是 await 了一个非 Promise 的数组解构导致的。
        const result = await new Promise((resolve) => {
          uni.request({
            url: API_BASE + '/api/state',
            timeout: 8000,
            success: (res) => resolve([null, res]),
            fail: (err) => resolve([err, null]),
          })
        })
        const [err, res] = result
        if (err) throw err
        if (res.statusCode !== 200) throw new Error('HTTP ' + res.statusCode)
        this.services = res.data.services || []
        this.overview = res.data.overview || { total: this.services.length, healthy: 0 }
        this.error = ''
      } catch (e) {
        this.error = '读取失败（面板没在跑？）' + (e.errMsg || e.message || '')
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
      if ((s.level_number || 0) >= 4) return 'ok'
      if ((s.level_number || 0) >= 3) return 'warn'
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
