<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAdminAvatar } from '@/composables/useAdminAvatar';
import type { Admin } from '@/types/pb';

const props = withDefaults(
  defineProps<{
    member: Pick<
      Admin,
      'id' | 'collectionId' | 'collectionName' | 'avatar' | 'name' | 'email'
    >;
    size?: 'normal' | 'large' | 'xlarge';
    editable?: boolean;
    busy?: boolean;
  }>(),
  { size: 'normal' },
);
const emit = defineEmits<{ upload: [file: File] }>();

const sizes = {
  normal: 'size-9 text-xs',
  large: 'size-14 text-base',
  xlarge: 'size-20 text-xl',
};
const imageTypes = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/gif',
  'image/webp',
];
const error = ref('');
const failed = ref(false);
const image = useAdminAvatar(() => props.member, '64x64');
const initials = computed(() => {
  const name =
    props.member.name?.trim() || props.member.email?.split('@')[0] || '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => [...part][0])
    .join('')
    .toUpperCase();
});

watch(image, () => (failed.value = false));

function select(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  error.value = '';
  if (!imageTypes.includes(file.type)) {
    error.value = 'Selecciona una imagen JPEG, PNG, SVG, GIF o WebP';
  } else if (file.size > 2 * 1024 * 1024) {
    error.value = 'La imagen no puede superar 2 MB';
  } else {
    emit('upload', file);
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <span
      :class="[
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary',
        sizes[size],
      ]"
      aria-hidden="true"
    >
      <img
        v-if="image && !failed"
        :src="image"
        alt=""
        class="size-full object-cover"
        @error="failed = true"
      />
      <span v-else>{{ initials }}</span>
    </span>
    <div v-if="editable">
      <label
        class="inline-block cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline focus-within:outline-2 has-disabled:cursor-not-allowed has-disabled:opacity-60"
      >
        <input
          class="sr-only"
          type="file"
          :accept="imageTypes.join(',')"
          :disabled="busy"
          @change="select"
        />
        Cambiar foto
      </label>
      <p
        v-if="error"
        class="text-sm text-red-600 dark:text-red-400"
        role="alert"
      >
        {{ error }}
      </p>
    </div>
  </div>
</template>
