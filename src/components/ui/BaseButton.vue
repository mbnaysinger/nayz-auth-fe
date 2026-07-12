<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>()

const baseClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:scale-[0.98]"

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'outline': return "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground shadow-sm"
    case 'ghost': return "hover:bg-accent hover:text-accent-foreground"
    case 'destructive': return "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
    case 'primary':
    default:
      return "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return "h-9 px-3"
    case 'lg': return "h-11 px-8 rounded-md"
    case 'md':
    default:
      return "h-10 py-2 px-4"
  }
})
</script>

<template>
  <button :type="type || 'button'" :class="[baseClass, variantClasses, sizeClasses]" :disabled="disabled || isLoading">
    <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
    <slot />
  </button>
</template>
