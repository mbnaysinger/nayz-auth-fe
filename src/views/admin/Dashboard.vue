<script setup lang="ts">
import { useRouter } from 'vue-router'
import { clearToken } from '@/lib/api'

const router = useRouter()

function logout() {
  clearToken()
  router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-muted/10">
    <header class="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div class="font-bold text-lg">nayz-auth <span class="font-normal text-muted-foreground ml-2">Console</span></div>
      <button 
        @click="logout"
        class="text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors"
      >
        Sair
      </button>
    </header>

    <main class="max-w-6xl mx-auto p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold tracking-tight">Aplicações (Em Breve)</h1>
        <p class="text-muted-foreground mt-1">Gerencie os acessos de todas as aplicações da sua arquitetura.</p>
      </div>

      <div class="bg-card border border-border rounded-lg h-64 flex items-center justify-center text-muted-foreground">
        A listagem de aplicações consumindo a API será montada aqui na próxima iteração!
      </div>
    </main>
  </div>
</template>
