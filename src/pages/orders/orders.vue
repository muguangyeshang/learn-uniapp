<template>
  <view class="page">
    <view class="header">
      <text class="title">后台 · 预约订单</text>
      <text class="sub">来自小程序表单 · 下拉刷新</text>
    </view>

    <view class="stats">
      <view class="stat" v-for="s in statCards" :key="s.key">
        <text class="num">{{ stats[s.key] ?? 0 }}</text>
        <text class="cap">{{ s.label }}</text>
      </view>
    </view>

    <scroll-view scroll-x class="tabs">
      <view
        class="tab" :class="{ active: filter === f.key }"
        v-for="f in filters" :key="f.key"
        @click="setFilter(f.key)"
      >{{ f.label }}</view>
    </scroll-view>

    <view v-if="!loaded" class="state"><text>正在读取订单…</text></view>
    <view v-else-if="error" class="state bad">
      <text>{{ error }}</text>
      <button size="mini" @click="load">重试</button>
    </view>
    <view v-else>
      <view class="card" v-for="o in shown" :key="o.id">
        <view class="top">
          <text class="id">#{{ o.id }} · {{ o.service }}</text>
        </view>
        <!-- 状态独立成行：uni-app 的 text/view 在 flex 或绝对定位下会塌缩，
             普通块级文字行不会，兼容性最稳 -->
        <view class="statusline" :class="o.status"><text>{{ statusText(o.status) }}</text></view>
        <text class="line">联系人 {{ o.customerName }} · {{ o.phone }}</text>
        <text class="line">期望 {{ o.preferredAt || '未指定' }} · 来源 {{ o.source || '-' }}</text>
        <text class="line" v-if="o.note">备注：{{ o.note }}</text>
        <text class="line dim">创建 {{ (o.createdAt || '').replace('T', ' ').slice(0, 19) }}</text>
        <view class="actions">
          <button size="mini" v-if="o.status === 'NEW'" @click="change(o, 'ACCEPTED')">接单</button>
          <button size="mini" v-if="o.status === 'ACCEPTED'" @click="change(o, 'DONE')">完成</button>
          <button size="mini" v-if="o.status !== 'CANCELLED' && o.status !== 'DONE'" @click="change(o, 'CANCELLED')">取消</button>
          <text v-if="o.status === 'DONE' || o.status === 'CANCELLED'" class="dim">已结单</text>
        </view>
      </view>
      <view v-if="!shown.length" class="state"><text>这个状态下还没有订单</text></view>
    </view>

    <view class="foot"><text class="link" @click="goBook">＋ 新建预约</text></view>
  </view>
</template>

<script>
import { api } from '../../common/api.js'

// 后台数据页：只读列表 + 状态机推进。字段直接吃后端 OrderEntity，
// 前端不另造一套模型，避免接口改字段时两侧对不上。
export default {
  data() {
    return {
      loaded: false,
      error: '',
      orders: [],
      stats: {},
      filter: 'ALL',
      filters: [
        { key: 'ALL', label: '全部' },
        { key: 'NEW', label: '待接单' },
        { key: 'ACCEPTED', label: '已接单' },
        { key: 'DONE', label: '已完成' },
        { key: 'CANCELLED', label: '已取消' },
      ],
      statCards: [
        { key: 'TOTAL', label: '总单' },
        { key: 'NEW', label: '待接单' },
        { key: 'ACCEPTED', label: '已接单' },
        { key: 'DONE', label: '已完成' },
      ],
    }
  },
  computed: {
    shown() {
      if (this.filter === 'ALL') return this.orders
      return this.orders.filter(o => o.status === this.filter)
    },
  },
  onShow() { this.load() },
  onPullDownRefresh() { this.load().finally(() => uni.stopPullDownRefresh()) },
  methods: {
    statusText(s) {
      return { NEW: '待接单', ACCEPTED: '已接单', DONE: '已完成', CANCELLED: '已取消' }[s] || s
    },
    setFilter(k) { this.filter = k },
    async load() {
      try {
        const [rows, stats] = await Promise.all([
          api('GET', '/api/orders'),
          api('GET', '/api/orders/stats'),
        ])
        this.orders = rows || []
        this.stats = stats || {}
        this.error = ''
      } catch (e) {
        this.error = '读取失败：' + (e.message || '')
      } finally {
        this.loaded = true
      }
    },
    async change(o, next) {
      try {
        const updated = await api('PATCH', '/api/orders/' + o.id + '/status', { status: next })
        // 就地替换，避免整表重拉造成的闪烁
        const i = this.orders.findIndex(x => x.id === o.id)
        if (i >= 0) this.orders.splice(i, 1, updated)
        this.stats = await api('GET', '/api/orders/stats')
        uni.showToast({ title: this.statusText(next), icon: 'none' })
      } catch (e) {
        uni.showModal({ title: '操作失败', content: e.message || '', showCancel: false })
      }
    },
    goBook() { uni.navigateTo({ url: '/pages/book/book' }) },
  },
}
</script>

<style>
.page { padding: 20rpx; }
.header { padding: 10rpx 0 20rpx; }
.title { font-size: 40rpx; font-weight: bold; }
.sub { font-size: 24rpx; color: #888; display: block; margin-top: 6rpx; }
.stats { display: flex; gap: 12rpx; margin-bottom: 20rpx; width: 100%; box-sizing: border-box; }
.stat { flex: 1; min-width: 0; background: #fff; border: 1rpx solid #eee; border-radius: 14rpx; padding: 18rpx 0; text-align: center; box-sizing: border-box; }
.num { font-size: 36rpx; font-weight: bold; display: block; }
.cap { font-size: 22rpx; color: #888; display: block; margin-top: 4rpx; }
.tabs { white-space: nowrap; margin-bottom: 20rpx; }
.tab { display: inline-block; padding: 12rpx 26rpx; margin-right: 12rpx; background: #fff; border: 1rpx solid #e5e5e5; border-radius: 30rpx; font-size: 26rpx; color: #666; }
.tab.active { background: #2b6cb0; color: #fff; border-color: #2b6cb0; }
.state { padding: 60rpx 20rpx; text-align: center; color: #888; }
.state.bad { color: #c0392b; }
.card { background: #fff; border: 1rpx solid #eee; border-left-width: 8rpx; border-left-color: #2b6cb0; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.top { display: block; margin-bottom: 8rpx; }
.id { display: block; font-size: 30rpx; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 状态独立成行、纯块级：不依赖 flex 收缩，也不依赖绝对定位，跨端最稳 */
.statusline { font-size: 24rpx; font-weight: 600; margin-bottom: 10rpx; }
.statusline.NEW { color: #b7791f; }
.statusline.ACCEPTED { color: #2b6cb0; }
.statusline.DONE { color: #1e8449; }
.statusline.CANCELLED { color: #c0392b; }
.line { font-size: 25rpx; color: #555; display: block; margin-top: 6rpx; }
.dim { color: #999; font-size: 22rpx; }
.actions { display: flex; gap: 12rpx; align-items: center; margin-top: 16rpx; }
.actions button { margin: 0; font-size: 24rpx; }
.foot { padding: 20rpx 10rpx 40rpx; }
.link { font-size: 26rpx; color: #2b6cb0; }
</style>
