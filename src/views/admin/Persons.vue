<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Pencil, Trash2, Contact } from 'lucide-vue-next'
import { admin, ApiError } from '@/lib/api'
import type { Person, User } from '@/types'
import AdminLayout from '@/layouts/AdminLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const persons = ref<Person[]>([])
const users = ref<User[]>([])
const loading = ref(true)

// Mapa user_id → username para exibir o usuário vinculado
const usernameByUserId = computed(() => {
  const map = new Map<string, string>()
  users.value.forEach((u) => map.set(u.id, u.username))
  return map
})

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

async function loadData() {
  try {
    const [personList, userList] = await Promise.all([admin.getPersons(), admin.getUsers()])
    persons.value = personList
    users.value = userList
  } catch (error) {
    toast.error(errorMessage(error, 'Erro ao carregar pessoas'))
  }
}

onMounted(async () => {
  await loadData()
  loading.value = false
})

// ---------------------------------------------------------------------------
// Criação / edição
// ---------------------------------------------------------------------------

const isFormOpen = ref(false)
const saving = ref(false)
const editingPerson = ref<Person | null>(null)
const formError = ref('')

const form = ref({
  identifier: '',
  name: '',
  phone: '',
  birth_date: '',
  is_active: true,
})

function openCreate() {
  editingPerson.value = null
  form.value = { identifier: '', name: '', phone: '', birth_date: '', is_active: true }
  formError.value = ''
  isFormOpen.value = true
}

function openEdit(person: Person) {
  editingPerson.value = person
  form.value = {
    identifier: person.identifier,
    name: person.name,
    phone: person.phone ?? '',
    birth_date: person.birth_date ? person.birth_date.slice(0, 10) : '',
    is_active: person.is_active,
  }
  formError.value = ''
  isFormOpen.value = true
}

async function onSubmit() {
  formError.value = ''
  if (!form.value.identifier.trim() || !form.value.name.trim()) {
    formError.value = 'Informe ao menos o identificador e o nome.'
    return
  }
  const payload = {
    identifier: form.value.identifier.trim(),
    name: form.value.name.trim(),
    phone: form.value.phone.trim() || null,
    is_active: form.value.is_active,
    // O backend Go decodifica *time.Time, que exige RFC3339 (não aceita só YYYY-MM-DD)
    birth_date: form.value.birth_date ? `${form.value.birth_date}T00:00:00Z` : null,
  }
  saving.value = true
  try {
    if (editingPerson.value) {
      // Preserva o vínculo com usuário existente no PUT
      await admin.updatePerson(editingPerson.value.id, {
        ...payload,
        user_id: editingPerson.value.user_id,
      })
      toast.success(`Pessoa "${payload.name}" atualizada.`)
    } else {
      await admin.createPerson(payload)
      toast.success(`Pessoa "${payload.name}" criada.`)
    }
    isFormOpen.value = false
    await loadData()
  } catch (error) {
    const message = errorMessage(error, 'Falha ao salvar a pessoa')
    formError.value = message
    toast.error(message)
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------------
// Exclusão
// ---------------------------------------------------------------------------

const personToDelete = ref<Person | null>(null)
const deleting = ref(false)

async function onDelete() {
  if (!personToDelete.value) return
  deleting.value = true
  try {
    await admin.deletePerson(personToDelete.value.id)
    toast.success(`Pessoa "${personToDelete.value.name}" excluída.`)
    personToDelete.value = null
    await loadData()
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao excluir a pessoa'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Pessoas</h1>
        <p class="text-muted-foreground mt-1 text-sm sm:text-base">Cadastro de pessoas físicas e seus vínculos com usuários.</p>
      </div>
      <BaseButton @click="openCreate" variant="primary">
        <Plus class="w-4 h-4 mr-2" />
        Nova Pessoa
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
      <div v-else-if="persons.length === 0" class="flex flex-col items-center justify-center p-16 text-center animate-in fade-in">
        <div class="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
          <Contact class="h-10 w-10 text-primary" />
        </div>
        <h3 class="text-xl font-bold mb-2 text-foreground">Nenhuma Pessoa</h3>
        <p class="text-muted-foreground max-w-md mb-8">Ainda não existem pessoas físicas cadastradas no Identity Provider.</p>
        <BaseButton @click="openCreate" variant="outline" size="lg">Cadastrar Primeira Pessoa</BaseButton>
      </div>

      <!-- Tabela -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Nome</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Identificador</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Telefone</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Usuário Vinculado</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Status</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="person in persons" :key="person.id" class="bg-card hover:bg-muted/30 transition-colors group">
              <td class="px-6 py-4 font-bold text-foreground whitespace-nowrap">{{ person.name }}</td>
              <td class="px-6 py-4 text-muted-foreground font-mono text-xs whitespace-nowrap">{{ person.identifier }}</td>
              <td class="px-6 py-4 text-muted-foreground whitespace-nowrap">{{ person.phone || '—' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="person.user_id" class="text-foreground">{{ usernameByUserId.get(person.user_id) || person.user_id }}</span>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-6 py-4">
                <span v-if="person.is_active" class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20 shadow-sm">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></div> Ativa
                </span>
                <span v-else class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive border-destructive/20 shadow-sm">
                  <div class="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5"></div> Inativa
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="openEdit(person)"
                    class="p-2 text-primary hover:bg-primary/10 rounded-md transition-all outline-none border border-transparent hover:border-primary/20"
                    title="Editar Pessoa"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    @click="personToDelete = person"
                    class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                    title="Excluir Pessoa"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: criar/editar pessoa -->
    <AppModal
      v-model="isFormOpen"
      :title="editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'"
      :description="editingPerson ? editingPerson.name : 'Cadastre uma nova pessoa física no Identity Provider.'"
    >
      <form @submit.prevent="onSubmit" class="space-y-4 mt-4">
        <BaseInput v-model="form.name" label="Nome" placeholder="Ex: Maria da Silva" required />
        <BaseInput v-model="form.identifier" label="Identificador" placeholder="Ex: CPF ou e-mail" required />
        <BaseInput v-model="form.phone" label="Telefone" placeholder="Ex: (11) 99999-0000" />
        <BaseInput v-model="form.birth_date" label="Data de Nascimento" type="date" />

        <label class="flex items-center gap-2 text-sm cursor-pointer text-foreground">
          <input v-model="form.is_active" type="checkbox" class="h-4 w-4 accent-primary" />
          Ativa
        </label>

        <p v-if="formError" class="text-sm text-destructive font-medium">{{ formError }}</p>

        <div class="flex justify-end space-x-3 pt-2">
          <BaseButton type="button" variant="ghost" @click="isFormOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :is-loading="saving">
            {{ editingPerson ? 'Salvar' : 'Criar' }}
          </BaseButton>
        </div>
      </form>
    </AppModal>

    <!-- Confirmação de exclusão -->
    <ConfirmModal
      :model-value="personToDelete !== null"
      title="Excluir Pessoa"
      :message="`Tem certeza que deseja excluir “${personToDelete?.name}”?`"
      :is-loading="deleting"
      @update:model-value="personToDelete = null"
      @confirm="onDelete"
    />

  </AdminLayout>
</template>
