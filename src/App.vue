<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import { useDark } from '@vueuse/core'

// Resgata o estado do DarkMode gerido nativamente pelo @vueuse/core
const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: 'light'
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
    <router-view />
    <!-- O toast precisa explicitamente saber qual é o theme, senão quebra as cores -->
    <Toaster position="top-right" richColors :theme="isDark ? 'dark' : 'light'" />
  </div>
</template>
