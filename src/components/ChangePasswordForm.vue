<template>
  <section class="password-panel" aria-labelledby="change-password-title">
    <div v-if="!editing" class="collapsed-card">
      <div class="collapsed-copy">
        <h2>Password</h2>
        <p>Change your account password.</p>
        <p v-if="success" class="message success" role="status">{{ success }}</p>
      </div>
      <button class="edit-toggle" type="button" @click="startEditing">
        Change
      </button>
    </div>
    <template v-else>
      <div class="edit-card">
        <div class="heading">
          <h2 id="change-password-title">Change password</h2>
          <p>Enter your new password below.</p>
        </div>
        <form @submit.prevent="changePassword">
          <label>
            New password
            <input v-model="password" type="password" autocomplete="new-password" minlength="6" required placeholder="Enter new password" />
          </label>
          <label>
            Confirm new password
            <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="6" required placeholder="Enter it again" />
          </label>
          <p v-if="error" class="message error" role="alert">{{ error }}</p>
          <div class="actions">
            <button type="submit" class="submit" :disabled="saving">{{ saving ? 'Updating…' : 'Save new password' }}</button>
            <button class="cancel" type="button" :disabled="saving" @click="cancelEditing">Cancel</button>
          </div>
        </form>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { updateMyPassword } from '../services/auth'

const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const saving = ref(false)
const editing = ref(false)

function startEditing() {
  error.value = ''
  success.value = ''
  editing.value = true
}

function cancelEditing() {
  password.value = ''
  confirmPassword.value = ''
  error.value = ''
  success.value = ''
  editing.value = false
}

async function changePassword() {
  error.value = ''
  success.value = ''

  if (password.value.length < 6) {
    error.value = 'Your new password must be at least 6 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'The passwords do not match.'
    return
  }

  saving.value = true
  try {
    await updateMyPassword(password.value)
    password.value = ''
    confirmPassword.value = ''
    success.value = 'Your password has been updated.'
    editing.value = false
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to update your password. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.password-panel { margin-top: 14px; }
.collapsed-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0 0; border-top: 1px solid #eee6e1; }
.collapsed-copy { min-width: 0; }
.collapsed-copy h2,
.heading h2 { margin: 0 0 3px; color: #3e302c; font: 700 13px var(--font-body); }
.collapsed-copy > p:not(.message),
.heading p { margin: 0; color: #887a74; font-size: 11px; line-height: 1.45; }
.edit-toggle {
  min-height: 30px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eadfd8;
  border-radius: 9px;
  padding: 0 12px;
  background: #fff;
  color: var(--coral-dark);
  font: 600 11px var(--font-body);
  cursor: pointer;
}
.edit-toggle:hover { background: #fff8f6; border-color: #dfc7c0; }
.edit-card { padding: 14px 0 0; border-top: 1px solid #eee6e1; }
.heading { margin-bottom: 12px; }
form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: end; }
label { display: grid; gap: 5px; color: #55453f; font-size: 10px; font-weight: 700; }
input {
  width: 100%;
  min-height: 36px;
  box-sizing: border-box;
  border: 1px solid #eaded8;
  border-radius: 8px;
  padding: 7px 10px;
  background: #fff;
  color: #40332f;
  font: 11px var(--font-body);
}
input::placeholder { color: #b5a7a0; }
input:focus { outline: none; border-color: var(--coral); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.actions button {
  min-height: 34px;
  border: 1px solid #eadfd8;
  border-radius: 8px;
  padding: 0 11px;
  background: #fff;
  color: #705f58;
  font: 600 10px var(--font-body);
  cursor: pointer;
}
.actions button:disabled { opacity: .6; cursor: wait; }
.actions .submit { border-color: var(--coral); background: var(--coral); color: #fff; }
.message { grid-column: 1 / -1; margin: 0; font-size: 10px; }
.error { color: #a92f2f; }
.success { margin-top: 5px !important; color: #26734d !important; }
@media (max-width: 640px) {
  .collapsed-card { align-items: center; }
  form { grid-template-columns: 1fr; }
}
</style>
