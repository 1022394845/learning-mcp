<script setup>
import 'echarts'
import VChart from 'vue-echarts'

const props = defineProps({
  option: {
    type: String,
    required: true
  }
})
</script>

<template>
  <VChart class="chart" :option="option"></VChart>
</template>

<style scoped>
.chart {
  height: 400px;
}
</style>
