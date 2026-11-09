<template>
  <view class="page">
    <view class="header">
      <text class="title">服务预约</text>
      <text class="sub">填完提交，后台数据页会实时出现这张单</text>
    </view>

    <view class="card">
      <view class="field">
        <text class="label">联系人 <text class="req">*</text></text>
        <input class="input" v-model="form.customerName" placeholder="怎么称呼您" maxlength="64" />
      </view>

      <view class="field">
        <text class="label">手机号 <text class="req">*</text></text>
        <input class="input" v-model="form.phone" type="number" placeholder="11 位手机号" maxlength="11" />
      </view>

      <view class="field">
        <text class="label">预约项目 <text class="req">*</text></text>
        <picker mode="selector" :range="services" :value="serviceIndex" @change="onService">
          <view class="picker">{{ services[serviceIndex] }} <text class="arrow">▾</text></view>
        </picker>
      </view>

      <view class="row">
        <view class="field half">
          <text class="label">期望日期</text>
          <picker mode="date" :value="date" :start="today" @change="onDate">
            <view class="picker">{{ date }} <text class="arrow">▾</text></view>
          </picker>
        </view>
        <view class="field half">
          <text class="label">期望时间</text>
          <picker mode="time" :value="time" @change="onTime">
            <view class="picker">{{ time }} <text class="arrow">▾</text></view>
          </picker>
        </view>
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="form.note" placeholder="现场情况、地址、其他要求" maxlength="255" />
      </view>

      <button class="submit" type="primary" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : '提交预约' }}
      </button>

      <view v-if="error" class="msg bad"><text>{{ error }}</text></view>
      <view v-if="success" class="msg ok">
        <text>预约成功，单号 #{{ success.id }} · 状态 {{ statusText(success.status) }}</text>
        <text class="hint">同一手机号 {{ dedupeHint }} 分钟内重复提交同一项目会被后端拒绝</text>
      </view>
    </view>

    <view class="foot">
      <text class="link" @click="goOrders">查看后台订单 →</text>
      <text class="link" @click="goIndex">← 返回服务看板</text>
    </view>
  </view>
</template>

<script>
import { api } from '../../common/api.js'

// 表单字段与后端 OrderEntity 一一对应；status/createdAt 由服务端生成，
// 客户端不传 —— 这是「不信任客户端」的最小实践。
export default {
  data() {
    const d = new Date()
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    return {
      services: ['上门检修', '系统部署', '安全巡检', '数据迁移'],
      serviceIndex: 0,
      date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      time: '10:00',
      today: d.getFullYear() + '-01-01',
      dedupeHint: 10,
      form: { customerName: '', phone: '', service: '上门检修', note: '' },
      submitting: false,
      error: '',
      success: null,
    }
  },
  methods: {
    onService(e) {
      this.serviceIndex = Number(e.detail.value)
      this.form.service = this.services[this.serviceIndex]
    },
    onDate(e) { this.date = e.detail.value },
    onTime(e) { this.time = e.detail.value },
    statusText(s) {
      return { NEW: '待接单', ACCEPTED: '已接单', DONE: '已完成', CANCELLED: '已取消' }[s] || s
    },
    validate() {
      if (!this.form.customerName.trim()) return '请填联系人'
      if (!/^1[3-9]\d{9}$/.test(this.form.phone)) return '手机号格式不对'
      if (!this.form.service) return '请选择预约项目'
      return ''
    },
    async submit() {
      this.error = ''
      this.success = null
      const bad = this.validate()
      if (bad) { this.error = bad; return }
      this.submitting = true
      try {
        const payload = Object.assign({}, this.form, {
          customerName: this.form.customerName.trim(),
          preferredAt: this.date + 'T' + this.time + ':00',
          source: 'miniapp',
        })
        this.success = await api('POST', '/api/orders', payload)
        // 保留联系人和手机号，清空备注，方便连续下单
        this.form.note = ''
        uni.showToast({ title: '预约已提交', icon: 'success' })
      } catch (e) {
        this.error = '提交失败：' + (e.message || '')
      } finally {
        this.submitting = false
      }
    },
    goOrders() { uni.navigateTo({ url: '/pages/orders/orders' }) },
    goIndex() { uni.navigateBack({ delta: 1 }) },
  },
}
</script>

<style>
.page { padding: 20rpx; }
.header { padding: 10rpx 0 20rpx; }
.title { font-size: 40rpx; font-weight: bold; }
.sub { font-size: 24rpx; color: #888; display: block; margin-top: 6rpx; }
/* rpx：750rpx = 屏宽，手机端自动缩放；卡片白底与首页一致 */
.card { background: #fff; border: 1rpx solid #eee; border-radius: 16rpx; padding: 24rpx; }
.field { margin-bottom: 24rpx; }
.row { display: flex; gap: 16rpx; }
.half { flex: 1; }
.label { font-size: 26rpx; color: #333; display: block; margin-bottom: 10rpx; }
.req { color: #c0392b; }
.input, .picker, .textarea {
  background: #f8f8f8; border: 1rpx solid #e5e5e5; border-radius: 10rpx;
  padding: 18rpx 20rpx; font-size: 28rpx; color: #333; width: 100%; box-sizing: border-box;
}
.picker { display: flex; justify-content: space-between; align-items: center; }
.arrow { color: #999; }
.textarea { height: 140rpx; }
.submit { margin-top: 8rpx; font-size: 30rpx; }
.msg { margin-top: 20rpx; padding: 18rpx; border-radius: 10rpx; font-size: 26rpx; }
.msg.bad { background: #fdecea; color: #c0392b; }
.msg.ok { background: #eafaf1; color: #1e8449; }
.hint { display: block; margin-top: 8rpx; font-size: 22rpx; color: #5d8a6a; }
.foot { display: flex; justify-content: space-between; padding: 30rpx 10rpx; }
.link { font-size: 26rpx; color: #2b6cb0; }
</style>
