<script setup>
import { inject } from 'vue'
import 'echarts'
import VChart from 'vue-echarts'

const theme = inject('theme')

const props = defineProps({
  option: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <VChart class="chart" :option="option" :theme="theme"></VChart>
</template>

<style scoped>
.chart {
  height: 400px;
}
</style>
