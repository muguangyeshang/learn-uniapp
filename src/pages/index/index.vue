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
      <button size="mini" @click="load">重新读取</button>
    </view>

    <view v-else>
      <!-- v-for 和 Vue 网页版语法完全一致：UniApp = Vue 语法平移 -->
      <view class="card" :class="tone(s)" v-for="s in services" :key="s.id">
        <text class="name">{{ s.name }} :{{ s.port }}</text>
        <text class="info">{{ levelText(s.level) }} · 来自 {{ s.note }}</text>
      </view>
      <view v-if="!services.length" class="state"><text>云端还没有数据</text></view>
    </view>

    <view class="foot">
      <text class="link" @click="goBook">服务预约 →</text>
      <text class="link" @click="goOrders">后台订单 →</text>
    </view>
  </view>
</template>

<script>
import { api } from '../../common/api.js'

// 概念页：UniApp 不用 fetch，用自家请求 API——同一份代码在
// H5 走 XHR、在微信小程序走 wx.request，这就是「跨端」的含义。
// 登录/带票/401 重登统一交给 common/api.js，三个页面共用一份状态。
export default {
  data() {
    return {
      loaded: false,
      error: '',
      services: [],
      reporter: '',
    }
  },
  onLoad() { this.load() },
  onPullDownRefresh() { this.load().finally(() => uni.stopPullDownRefresh()) },
  methods: {
    async load() {
      try {
        const rows = await api('GET', '/api/services')
        this.services = rows || []
        this.reporter = this.services.length
          ? [...new Set(this.services.map((r) => r.note).filter(Boolean))].join(' / ')
          : '云端'
        this.error = ''
      } catch (e) {
        this.error = '读取失败：' + (e.message || '')
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
    goBook() { uni.navigateTo({ url: '/pages/book/book' }) },
    goOrders() { uni.navigateTo({ url: '/pages/orders/orders' }) },
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
.foot { display: flex; justify-content: space-between; padding: 30rpx 10rpx 40rpx; }
.link { font-size: 26rpx; color: #2b6cb0; }
</style>
