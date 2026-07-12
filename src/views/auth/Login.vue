<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Loader2, LogIn, KeySquare, Mail } from 'lucide-vue-next'
import { auth, setToken, ApiError } from '@/lib/api'

const router = useRouter()

const activeTab = ref<'password' | 'passwordless'>('password')

// --- Form: Senha ---
const emailPassword = ref('')
const password = ref('')
const loadingPassword = ref(false)

async function onPasswordSubmit() {
  if (!emailPassword.value || !password.value) {
    toast.error('Preencha e-mail e senha')
    return
  }
  
  loadingPassword.value = true
  try {
    const res = await auth.login(emailPassword.value, password.value)
    if (res?.token) {
      setToken(res.token)
      toast.success('Acesso autorizado!')
      router.push('/admin')
    }
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message)
    } else {
      toast.error('Falha ao autenticar')
    }
  } finally {
    loadingPassword.value = false
  }
}

// --- Form: Passwordless ---
const emailPwdless = ref('')
const code = ref('')
const stepPwdless = ref<'request' | 'verify'>('request')
const loadingPwdless = ref(false)

async function onPwdlessRequest() {
  if (!emailPwdless.value) {
    toast.error('Informe seu e-mail')
    return
  }
  loadingPwdless.value = true
  try {
    await auth.passwordlessStart(emailPwdless.value)
    toast.success('Se o e-mail existir, enviamos um código de 6 dígitos.')
    stepPwdless.value = 'verify'
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error('Falha ao solicitar código')
  } finally {
    loadingPwdless.value = false
  }
}

async function onPwdlessVerify() {
  if (code.value.length !== 6) {
    toast.error('O código precisa ter 6 dígitos')
    return
  }
  loadingPwdless.value = true
  try {
    const res = await auth.passwordlessVerify(emailPwdless.value, code.value)
    if (res?.token) {
      setToken(res.token)
      toast.success('Acesso sem senha autorizado!')
      router.push('/admin')
    }
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.message)
    else toast.error('Código inválido ou expirado')
  } finally {
    loadingPwdless.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-muted/30 p-4">
    <div class="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
      
      <!-- Cabeçalho -->
      <div class="px-8 pt-10 pb-6 text-center space-y-2">
        <div class="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
          <KeySquare class="w-6 h-6 text-primary" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">nayz-auth Admin</h1>
        <p class="text-sm text-muted-foreground">
          Identifique-se para gerenciar aplicações e permissões
        </p>
      </div>

      <!-- Navegação das Tabs -->
      <div class="px-8 flex space-x-1 p-1 bg-muted rounded-lg mx-8 mb-6">
        <button 
          @click="activeTab = 'password'"
          class="flex-1 text-sm font-medium py-1.5 rounded-md transition-all"
          :class="activeTab === 'password' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        >
          Senha
        </button>
        <button 
          @click="activeTab = 'passwordless'"
          class="flex-1 text-sm font-medium py-1.5 rounded-md transition-all"
          :class="activeTab === 'passwordless' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        >
          Magic Code
        </button>
      </div>

      <div class="px-8 pb-10">
        <!-- TAB: Senha -->
        <form v-if="activeTab === 'password'" @submit.prevent="onPasswordSubmit" class="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">E-mail</label>
            <input 
              v-model="emailPassword"
              type="email" 
              placeholder="root@nayz.tech"
              class="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              required
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground">Senha</label>
            <input 
              v-model="password"
              type="password" 
              placeholder="••••••••"
              class="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              required
            />
          </div>
          <button 
            type="submit" 
            :disabled="loadingPassword"
            class="w-full h-10 mt-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Loader2 v-if="loadingPassword" class="w-4 h-4 mr-2 animate-spin" />
            <LogIn v-else class="w-4 h-4 mr-2" />
            Acessar Painel
          </button>
        </form>

        <!-- TAB: Passwordless -->
        <div v-else class="animate-in fade-in slide-in-from-bottom-2">
          
          <!-- Etapa 1: Pedir Email -->
          <form v-if="stepPwdless === 'request'" @submit.prevent="onPwdlessRequest" class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground">E-mail Corporativo</label>
              <input 
                v-model="emailPwdless"
                type="email" 
                placeholder="seu@email.com"
                class="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                required
              />
            </div>
            <button 
              type="submit" 
              :disabled="loadingPwdless"
              class="w-full h-10 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Loader2 v-if="loadingPwdless" class="w-4 h-4 mr-2 animate-spin" />
              <Mail v-else class="w-4 h-4 mr-2" />
              Receber Código
            </button>
          </form>

          <!-- Etapa 2: Validar Código -->
          <form v-else @submit.prevent="onPwdlessVerify" class="space-y-5">
            <div class="bg-muted p-3 rounded-md text-sm text-center border border-border">
              Código enviado para <span class="font-bold">{{ emailPwdless }}</span>
            </div>
            <div class="space-y-1.5 text-center">
              <label class="text-sm font-medium text-foreground">Código de 6 dígitos</label>
              <!-- Input OTP Simples e Elegante para Vue (substituindo o Shadcn React) -->
              <input 
                v-model="code"
                type="text"
                maxlength="6"
                class="w-full text-center tracking-[0.5em] text-2xl h-12 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                placeholder="------"
                required
              />
            </div>
            <button 
              type="submit" 
              :disabled="loadingPwdless"
              class="w-full h-10 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Loader2 v-if="loadingPwdless" class="w-4 h-4 mr-2 animate-spin" />
              Confirmar e Entrar
            </button>
            <button 
              type="button"
              @click="stepPwdless = 'request'; code = ''"
              class="w-full text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Tentar outro e-mail
            </button>
          </form>

        </div>
      </div>
    </div>
  </div>
</template>
