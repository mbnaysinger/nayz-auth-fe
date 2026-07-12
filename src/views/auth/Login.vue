<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { LogIn, Mail, Sun, Moon } from 'lucide-vue-next'
import { auth, setToken, ApiError } from '@/lib/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useDark, useToggle } from '@vueuse/core'

const router = useRouter()
const isDark = useDark({ selector: 'html', attribute: 'class', valueDark: 'dark', valueLight: 'light' })
const toggleDark = useToggle(isDark)

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
    toast.error(err instanceof ApiError ? err.message : 'Falha ao autenticar')
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
    toast.success('Se o e-mail existir, enviamos um código.')
    stepPwdless.value = 'verify'
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Falha ao solicitar código')
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
    toast.error(err instanceof ApiError ? err.message : 'Código inválido ou expirado')
  } finally {
    loadingPwdless.value = false
  }
}
</script>

<template>
  <!-- Background abstrato e limpo com suporte a Dark Mode -->
  <div class="min-h-screen flex flex-col bg-muted/30">
    
    <!-- Topbar Minimalista apenas para o botão de Dark Mode e Estética -->
    <header class="p-6 flex justify-end">
      <button @click="toggleDark()" class="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors focus:outline-none">
        <Sun v-if="!isDark" class="h-5 w-5" />
        <Moon v-else class="h-5 w-5" />
      </button>
    </header>

    <div class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-[400px]">
        <!-- Logo e Cabeçalho (Invertido dinamicamente no Dark Mode) -->
        <div class="mb-8 flex flex-col items-center">
          <img src="/nayztech.png" alt="NayzTech Logo" class="h-42 object-contain transition-all duration-300" />
          <h1 class="text-2xl font-semibold tracking-tight text-foreground"></h1>
          <p class="text-lg text-muted-foreground mt-3">
            Identity Provider
          </p>
        </div>

        <div class="bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
          <!-- Navegação das Tabs (Estilo Pílula/Segmented Control) -->
          <div class="flex p-1 bg-muted rounded-lg mb-6">
            <button 
              @click="activeTab = 'password'"
              class="flex-1 text-sm font-medium py-1.5 rounded-md transition-all"
              :class="activeTab === 'password' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            >
              Senha Fixa
            </button>
            <button 
              @click="activeTab = 'passwordless'"
              class="flex-1 text-sm font-medium py-1.5 rounded-md transition-all"
              :class="activeTab === 'passwordless' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            >
              Sem Senha (OTP)
            </button>
          </div>

          <!-- TAB: Senha -->
          <form v-if="activeTab === 'password'" @submit.prevent="onPasswordSubmit" class="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
            <BaseInput v-model="emailPassword" label="E-mail" type="email" placeholder="nome@nayz.tech" required />
            <BaseInput v-model="password" label="Senha" type="password" placeholder="••••••••" required />
            
            <BaseButton type="submit" variant="primary" class="w-full mt-2" :is-loading="loadingPassword">
              <LogIn v-if="!loadingPassword" class="w-4 h-4 mr-2" />
              Entrar no Sistema
            </BaseButton>
          </form>

          <!-- TAB: Passwordless -->
          <div v-else class="animate-in fade-in slide-in-from-right-2 duration-300">
            
            <!-- Etapa 1: Solicitar Email -->
            <form v-if="stepPwdless === 'request'" @submit.prevent="onPwdlessRequest" class="space-y-4">
              <BaseInput v-model="emailPwdless" label="E-mail Corporativo" type="email" placeholder="seu@email.com" required />
              
              <BaseButton type="submit" variant="primary" class="w-full" :is-loading="loadingPwdless">
                <Mail v-if="!loadingPwdless" class="w-4 h-4 mr-2" />
                Receber Código por E-mail
              </BaseButton>
            </form>

            <!-- Etapa 2: Validar OTP -->
            <form v-else @submit.prevent="onPwdlessVerify" class="space-y-5">
              <div class="bg-muted p-3 rounded-md text-sm text-center border border-border">
                Código de 6 dígitos enviado para <span class="font-bold text-foreground">{{ emailPwdless }}</span>
              </div>
              
              <BaseInput 
                v-model="code" 
                label="Código Seguro" 
                maxlength="6" 
                placeholder="000000" 
                class="text-center tracking-[0.5em] font-mono text-xl" 
                required 
              />

              <BaseButton type="submit" variant="primary" class="w-full" :is-loading="loadingPwdless">
                Autenticar
              </BaseButton>
              
              <button 
                type="button"
                @click="stepPwdless = 'request'; code = ''"
                class="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar e usar outro e-mail
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>
