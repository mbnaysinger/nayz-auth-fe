<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string | number
  label?: string
  error?: string
  id?: string
  type?: string
  placeholder?: string
  required?: boolean
  maxlength?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputId = computed(() => props.id || `input-${Math.random().toString(36).slice(2, 9)}`)
</script>

<template>
  <div class="space-y-1.5 w-full">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-foreground">
      {{ label }}
    </label>
    <div class="relative">
      <input
        :id="inputId"
        :type="type || 'text'"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :required="required"
        :maxlength="maxlength"
        class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
        :class="[
          error ? 'border-destructive focus-visible:ring-destructive/50' : 'border-input focus-visible:ring-primary/50 focus-visible:border-primary hover:border-muted-foreground/50'
        ]"
      />
    </div>
    <p v-if="error" class="text-sm text-destructive font-medium animate-in slide-in-from-top-1">{{ error }}</p>
  </div>
</template>
