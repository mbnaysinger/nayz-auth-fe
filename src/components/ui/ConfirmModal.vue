<script setup lang="ts">
import AppModal from '@/components/ui/AppModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <AppModal :model-value="modelValue" :title="title" @update:model-value="emit('update:modelValue', $event)">
    <p class="text-sm text-muted-foreground">{{ message }}</p>
    <div class="mt-6 flex justify-end space-x-3">
      <BaseButton variant="ghost" :disabled="isLoading" @click="emit('update:modelValue', false)">
        Cancelar
      </BaseButton>
      <BaseButton variant="destructive" :is-loading="isLoading" @click="emit('confirm')">
        {{ confirmLabel || 'Excluir' }}
      </BaseButton>
    </div>
  </AppModal>
</template>
