<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, ShieldCheck, Link2, Loader2, Users as UsersIcon } from 'lucide-vue-next'
import { admin, auth, ApiError } from '@/lib/api'
import type { Application, Person, Role, User } from '@/types'
import AdminLayout from '@/layouts/AdminLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

const users = ref<User[]>([])
const loading = ref(true)
const togglingId = ref<string | null>(null)

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

async function loadUsers() {
  try {
    users.value = await admin.getUsers()
  } catch (error) {
    toast.error(errorMessage(error, 'Erro ao carregar usuários'))
  }
}

onMounted(async () => {
  await loadUsers()
  loading.value = false
})

async function onToggleActive(user: User) {
  togglingId.value = user.id
  try {
    await admin.setUserActive(user.id, !user.is_active)
    user.is_active = !user.is_active
    toast.success(user.is_active ? `Usuário "${user.username}" ativado.` : `Usuário "${user.username}" desativado.`)
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao atualizar o usuário'))
  } finally {
    togglingId.value = null
  }
}

// ---------------------------------------------------------------------------
// Modal: Roles do usuário (por aplicação)
// ---------------------------------------------------------------------------

const rolesModalUser = ref<User | null>(null)
const loadingRolesModal = ref(false)
const userRoleIds = ref<Set<string>>(new Set())
const applications = ref<Application[]>([])
const selectedAppId = ref('')
const appRolesCache = ref<Record<string, Role[]>>({})
const loadingAppRoles = ref(false)
const pendingRoleIds = ref<Set<string>>(new Set())

const selectedAppRoles = computed(() => appRolesCache.value[selectedAppId.value] ?? [])

async function openRolesModal(user: User) {
  rolesModalUser.value = user
  loadingRolesModal.value = true
  userRoleIds.value = new Set()
  selectedAppId.value = ''
  try {
    const [roles, apps] = await Promise.all([admin.getUserRoles(user.id), admin.getApplications()])
    userRoleIds.value = new Set(roles.map((r) => r.id))
    applications.value = apps
  } catch (error) {
    toast.error(errorMessage(error, 'Erro ao carregar as roles do usuário'))
    rolesModalUser.value = null
  } finally {
    loadingRolesModal.value = false
  }
}

async function onSelectApp() {
  const appId = selectedAppId.value
  if (!appId || appRolesCache.value[appId]) return
  loadingAppRoles.value = true
  try {
    appRolesCache.value = { ...appRolesCache.value, [appId]: await admin.getRolesByApp(appId) }
  } catch (error) {
    toast.error(errorMessage(error, 'Erro ao carregar as roles da aplicação'))
  } finally {
    loadingAppRoles.value = false
  }
}

// Marcar/desmarcar aplica imediatamente via POST/DELETE
async function toggleUserRole(role: Role) {
  const user = rolesModalUser.value
  if (!user || pendingRoleIds.value.has(role.id)) return
  const isLinked = userRoleIds.value.has(role.id)
  pendingRoleIds.value = new Set([...pendingRoleIds.value, role.id])
  try {
    if (isLinked) {
      await admin.removeRoleFromUser(user.id, role.id)
      const next = new Set(userRoleIds.value)
      next.delete(role.id)
      userRoleIds.value = next
      toast.success(`Role "${role.name}" removida de ${user.username}`)
    } else {
      await admin.assignRoleToUser(user.id, role.id)
      userRoleIds.value = new Set([...userRoleIds.value, role.id])
      toast.success(`Role "${role.name}" atribuída a ${user.username}`)
    }
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao atualizar as roles do usuário'))
  } finally {
    const next = new Set(pendingRoleIds.value)
    next.delete(role.id)
    pendingRoleIds.value = next
  }
}

// ---------------------------------------------------------------------------
// Modal: Vínculo com pessoa
// ---------------------------------------------------------------------------

const personModalUser = ref<User | null>(null)
const loadingPersons = ref(false)
const persons = ref<Person[]>([])
const selectedPersonId = ref('')
const savingPersonLink = ref(false)

// Apenas pessoas ainda sem usuário podem ser vinculadas (filtro client-side)
const availablePersons = computed(() => persons.value.filter((p) => !p.user_id))
const linkedPerson = computed(() => {
  const user = personModalUser.value
  if (!user?.person_id) return null
  return persons.value.find((p) => p.id === user.person_id) ?? null
})

async function openPersonModal(user: User) {
  personModalUser.value = user
  selectedPersonId.value = ''
  loadingPersons.value = true
  try {
    persons.value = await admin.getPersons()
  } catch (error) {
    toast.error(errorMessage(error, 'Erro ao carregar pessoas'))
    personModalUser.value = null
  } finally {
    loadingPersons.value = false
  }
}

async function savePersonLink(person: Person, userId: string | null) {
  await admin.updatePerson(person.id, {
    user_id: userId,
    identifier: person.identifier,
    name: person.name,
    phone: person.phone,
    is_active: person.is_active,
    // Reenvia como veio da API (RFC3339) — o backend Go decodifica *time.Time
    birth_date: person.birth_date || null,
  })
}

async function onLinkPerson() {
  const user = personModalUser.value
  const person = persons.value.find((p) => p.id === selectedPersonId.value)
  if (!user || !person) return
  savingPersonLink.value = true
  try {
    await savePersonLink(person, user.id)
    toast.success(`Pessoa "${person.name}" vinculada a ${user.username}`)
    personModalUser.value = null
    await loadUsers()
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao vincular a pessoa'))
  } finally {
    savingPersonLink.value = false
  }
}

async function onUnlinkPerson() {
  const user = personModalUser.value
  const person = linkedPerson.value
  if (!user || !person) return
  savingPersonLink.value = true
  try {
    await savePersonLink(person, null)
    toast.success(`Pessoa "${person.name}" desvinculada de ${user.username}`)
    personModalUser.value = null
    await loadUsers()
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao desvincular a pessoa'))
  } finally {
    savingPersonLink.value = false
  }
}

// ---------------------------------------------------------------------------
// Modal: Novo usuário (POST /users/register)
// ---------------------------------------------------------------------------

const isNewUserOpen = ref(false)
const creatingUser = ref(false)
const newEmail = ref('')
const newUsername = ref('')
const newPassword = ref('')
const newUserError = ref('')

function openNewUser() {
  newEmail.value = ''
  newUsername.value = ''
  newPassword.value = ''
  newUserError.value = ''
  isNewUserOpen.value = true
}

async function onCreateUser() {
  newUserError.value = ''
  if (!newEmail.value.trim() || !newUsername.value.trim() || !newPassword.value) {
    newUserError.value = 'Preencha e-mail, username e senha.'
    return
  }
  creatingUser.value = true
  try {
    await auth.register(newEmail.value.trim(), newUsername.value.trim(), newPassword.value)
    toast.success(`Usuário "${newUsername.value.trim()}" criado com sucesso!`)
    isNewUserOpen.value = false
    await loadUsers()
  } catch (error) {
    const message = errorMessage(error, 'Falha ao criar o usuário')
    newUserError.value = message
    toast.error(message)
  } finally {
    creatingUser.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Usuários</h1>
        <p class="text-muted-foreground mt-1 text-sm sm:text-base">Gerencie as contas de acesso, suas roles e o vínculo com pessoas.</p>
      </div>
      <BaseButton @click="openNewUser" variant="primary">
        <Plus class="w-4 h-4 mr-2" />
        Novo Usuário
      </BaseButton>
    </div>

    <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">

      <!-- Skeleton de Loading -->
      <div v-if="loading" class="p-6 space-y-4">
        <div v-for="i in 3" :key="i" class="flex items-center space-x-4 animate-pulse">
          <div class="h-10 w-10 bg-muted rounded-md"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-muted rounded w-1/4"></div>
            <div class="h-3 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="users.length === 0" class="flex flex-col items-center justify-center p-16 text-center animate-in fade-in">
        <div class="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
          <UsersIcon class="h-10 w-10 text-primary" />
        </div>
        <h3 class="text-xl font-bold mb-2 text-foreground">Nenhum Usuário</h3>
        <p class="text-muted-foreground max-w-md mb-8">Ainda não existem contas cadastradas no Identity Provider.</p>
        <BaseButton @click="openNewUser" variant="outline" size="lg">Criar Primeiro Usuário</BaseButton>
      </div>

      <!-- Tabela -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Username</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">E-mail</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Pessoa Vinculada</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Ativo</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="user in users" :key="user.id" class="bg-card hover:bg-muted/30 transition-colors">
              <td class="px-6 py-4 font-bold text-foreground whitespace-nowrap">{{ user.username }}</td>
              <td class="px-6 py-4 text-muted-foreground whitespace-nowrap">{{ user.email }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="user.person_name" class="text-foreground">{{ user.person_name }}</span>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <ToggleSwitch
                    :model-value="user.is_active"
                    :disabled="togglingId === user.id"
                    :label="`Ativar/desativar ${user.username}`"
                    @update:model-value="onToggleActive(user)"
                  />
                  <Loader2 v-if="togglingId === user.id" class="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openRolesModal(user)"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                    title="Gerenciar Roles"
                  >
                    <ShieldCheck class="w-3.5 h-3.5" />
                    Roles
                  </button>
                  <button
                    @click="openPersonModal(user)"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                    title="Vincular Pessoa"
                  >
                    <Link2 class="w-3.5 h-3.5" />
                    Pessoa
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==============================================
         MODAL: ROLES DO USUÁRIO
         ============================================== -->
    <AppModal
      :model-value="rolesModalUser !== null"
      title="Roles do Usuário"
      :description="rolesModalUser ? `Gerencie as roles de ${rolesModalUser.username} por aplicação.` : ''"
      @update:model-value="rolesModalUser = null"
    >
      <div v-if="loadingRolesModal" class="flex justify-center py-8">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
      <div v-else class="space-y-4">
        <div class="space-y-1.5 w-full">
          <label class="text-sm font-medium text-foreground" for="roles-app-select">Aplicação</label>
          <select
            id="roles-app-select"
            v-model="selectedAppId"
            @change="onSelectApp"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-colors appearance-none cursor-pointer"
          >
            <option value="" disabled>Selecione uma aplicação...</option>
            <option v-for="app in applications" :key="app.id" :value="app.id">{{ app.name }}</option>
          </select>
        </div>

        <div v-if="selectedAppId">
          <div v-if="loadingAppRoles" class="flex justify-center py-6">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <p v-else-if="selectedAppRoles.length === 0" class="text-sm text-muted-foreground py-2">
            Esta aplicação não possui roles cadastradas.
          </p>
          <ul v-else class="space-y-1 max-h-64 overflow-y-auto pr-1">
            <li v-for="role in selectedAppRoles" :key="role.id">
              <label
                class="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm transition-colors"
                :class="pendingRoleIds.has(role.id) ? 'opacity-60 pointer-events-none' : ''"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                  :checked="userRoleIds.has(role.id)"
                  @change="toggleUserRole(role)"
                />
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {{ role.name }}
                </span>
                <Loader2 v-if="pendingRoleIds.has(role.id)" class="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
              </label>
            </li>
          </ul>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          Selecione uma aplicação para ver as roles disponíveis. As marcadas já estão vinculadas ao usuário.
        </p>
      </div>
    </AppModal>

    <!-- ==============================================
         MODAL: VÍNCULO COM PESSOA
         ============================================== -->
    <AppModal
      :model-value="personModalUser !== null"
      title="Vincular Pessoa"
      :description="personModalUser ? `Vínculo de pessoa física para ${personModalUser.username}.` : ''"
      @update:model-value="personModalUser = null"
    >
      <div v-if="loadingPersons" class="flex justify-center py-8">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
      <div v-else-if="personModalUser" class="space-y-4">

        <!-- Já possui pessoa: opção de desvincular -->
        <div v-if="personModalUser.person_id" class="space-y-4">
          <p class="text-sm text-foreground">
            Pessoa vinculada:
            <span class="font-bold">{{ linkedPerson?.name || personModalUser.person_name || '—' }}</span>
          </p>
          <p v-if="!linkedPerson" class="text-xs text-muted-foreground">
            Não foi possível localizar o cadastro completo da pessoa vinculada.
          </p>
          <div class="flex justify-end space-x-3">
            <BaseButton variant="ghost" :disabled="savingPersonLink" @click="personModalUser = null">Fechar</BaseButton>
            <BaseButton
              variant="destructive"
              :is-loading="savingPersonLink"
              :disabled="!linkedPerson"
              @click="onUnlinkPerson"
            >
              Desvincular
            </BaseButton>
          </div>
        </div>

        <!-- Sem pessoa: select de pessoas disponíveis -->
        <div v-else class="space-y-4">
          <div class="space-y-1.5 w-full">
            <label class="text-sm font-medium text-foreground" for="person-select">Pessoa (sem usuário vinculado)</label>
            <select
              id="person-select"
              v-model="selectedPersonId"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled>Selecione uma pessoa...</option>
              <option v-for="person in availablePersons" :key="person.id" :value="person.id">
                {{ person.name }} ({{ person.identifier }})
              </option>
            </select>
          </div>
          <p v-if="availablePersons.length === 0" class="text-sm text-muted-foreground">
            Não há pessoas sem vínculo disponíveis. Cadastre uma nova em Pessoas.
          </p>
          <div class="flex justify-end space-x-3">
            <BaseButton variant="ghost" :disabled="savingPersonLink" @click="personModalUser = null">Cancelar</BaseButton>
            <BaseButton :is-loading="savingPersonLink" :disabled="!selectedPersonId" @click="onLinkPerson">
              Vincular
            </BaseButton>
          </div>
        </div>
      </div>
    </AppModal>

    <!-- ==============================================
         MODAL: NOVO USUÁRIO
         ============================================== -->
    <AppModal v-model="isNewUserOpen" title="Novo Usuário" description="Cria uma conta de acesso via registro público (POST /users/register).">
      <form @submit.prevent="onCreateUser" class="space-y-4 mt-4">
        <BaseInput v-model="newEmail" label="E-mail" type="email" placeholder="pessoa@empresa.com" required />
        <BaseInput v-model="newUsername" label="Username" placeholder="Ex: maria.silva" required />
        <BaseInput v-model="newPassword" label="Senha" type="password" placeholder="••••••••" required />
        <p v-if="newUserError" class="text-sm text-destructive font-medium">{{ newUserError }}</p>
        <div class="flex justify-end space-x-3 pt-2">
          <BaseButton type="button" variant="ghost" @click="isNewUserOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :is-loading="creatingUser">Criar Usuário</BaseButton>
        </div>
      </form>
    </AppModal>

  </AdminLayout>
</template>
