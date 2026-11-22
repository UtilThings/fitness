import { onMounted, onUnmounted, ref } from 'vue';

export function useBookingClock() {
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval>;
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });
  onUnmounted(() => clearInterval(timer));
  return now;
}
