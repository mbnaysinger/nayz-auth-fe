<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, LayoutDashboard, Component, Menu, Sun, Moon, Users, Contact, CircleUserRound } from 'lucide-vue-next'
import { useDark, useToggle } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: 'light'
})
const toggleDark = useToggle(isDark)

const isSidebarOpen = ref(false)

const navigation = [
  { name: 'Visão Geral', route: '/admin', icon: LayoutDashboard },
  { name: 'Aplicações', route: '/admin/applications', icon: Component },
  { name: 'Usuários', route: '/admin/users', icon: Users },
  { name: 'Pessoas', route: '/admin/persons', icon: Contact },
]

function logout() {
  authStore.logout()
  router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col md:flex-row">
    <!-- Overlay Escuro no Mobile -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in"></div>

    <!-- Sidebar Lateral -->
    <aside 
      :class="isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'"
      class="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col"
    >
      <!-- Logo da Empresa Dinâmico (Sidebar) -->
      <div class="h-16 flex items-center px-6 border-b border-border bg-card">
        <!-- O 'dark:invert' nativo do Tailwind inverte a cor da imagem perfeitamente no Dark Mode -->
        <img src="/letreiro.png" alt="NayzTech Logo" />
      </div>

      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <router-link 
          v-for="item in navigation" 
          :key="item.name" 
          :to="item.route"
          class="flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200"
          active-class="bg-primary/10 text-primary font-bold shadow-sm"
          exact-active-class="bg-primary/10 text-primary font-bold shadow-sm"
          :class="[$route.path === item.route ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground']"
        >
          <component :is="item.icon" class="mr-3 h-5 w-5" />
          {{ item.name }}
        </router-link>
      </nav>

      <!-- Botão de Sair fixo no rodapé da Sidebar -->
      <div class="p-4 border-t border-border bg-card/50">
        <button @click="logout" class="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut class="mr-3 h-5 w-5" />
          Desconectar
        </button>
      </div>
    </aside>

    <!-- Content Area (Direita) -->
    <div class="flex-1 flex flex-col min-h-screen overflow-hidden">
      
      <!-- Topbar Header -->
      <header class="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
        <div class="flex items-center">
          <button @click="isSidebarOpen = !isSidebarOpen" class="md:hidden mr-4 p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <Menu class="h-5 w-5" />
          </button>
          <div class="font-medium text-foreground tracking-tight hidden sm:block">Painel de Controle Nayz</div>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Usuário logado (claim name ou sub do JWT) -->
          <div class="flex items-center gap-2 text-sm text-muted-foreground max-w-[180px] sm:max-w-none">
            <CircleUserRound class="h-5 w-5 shrink-0" />
            <span class="truncate">{{ authStore.displayName }}</span>
          </div>

          <!-- Toggle do Dark Mode com Ícones de Sol e Lua fluidos -->
          <button @click="toggleDark()" class="p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50">
            <Sun v-if="!isDark" class="h-5 w-5" />
            <Moon v-else class="h-5 w-5" />
          </button>
        </div>
      </header>

      <!-- Miolo / Canvas (As telas de Admin entram aqui) -->
      <main class="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6 lg:p-8">
        <div class="max-w-6xl mx-auto">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
