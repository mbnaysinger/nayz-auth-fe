<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { watch, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  description?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// Evita que o scroll do fundo (body) funcione quando o modal estiver aberto
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Overlay animado com Backdrop Blur -->
      <div 
        class="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in" 
        @click="emit('update:modelValue', false)"
      ></div>

      <!-- Modal Container -->
      <div class="z-50 w-full max-w-lg bg-card p-6 shadow-xl sm:rounded-2xl border border-border animate-in fade-in zoom-in-95 mx-4">
        
        <div class="flex flex-col space-y-1.5 text-left mb-6 relative pr-8">
          <h2 class="text-xl font-bold leading-none tracking-tight">{{ title }}</h2>
          <p v-if="description" class="text-sm text-muted-foreground mt-1">{{ description }}</p>
          
          <button 
            @click="emit('update:modelValue', false)"
            class="absolute -top-1 -right-1 p-2 rounded-full hover:bg-muted opacity-70 transition-colors hover:opacity-100 focus:outline-none"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div>
          <!-- Conteúdo do formulário injetado aqui -->
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
