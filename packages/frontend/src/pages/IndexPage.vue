<template>
  <div v-if="!userStore.isLogin" class="col-12 index-menu"
    style="background-image: url('img/bg_1.jpg'); background-size: cover;background-position: center center; min-height: 100vh;">
    <div class="row justify-evenly">
      <div class="col-12 q-mt-md">
        <div class="row">
          <div class="q-ml-auto col-md-6 col-sm-12 q-pa-md text-blue-grey-5">
            <div class="text-h2 text-bold text-positive">MansarTip</div>
            <div class="text-h4 text-bold text-deep-orange-8">Tipping on the goal</div>
            <p class="q-mt-lg text-bold text-orange-9">
              Simply register and start tipping in order to be in the run
              for awesome prizes 😍🎊🎉<br/>
              Friendly and free soccer world cup tipping for families and friends.
            </p>
          </div>
        </div>
      </div>

      <div class="col-9 q-mt-md q-mb-xs-lg">
        <div class="row">
          <div class="q-ml-auto col-md-6 col-sm-12 q-pa-md bg-blue-grey-10"
            style="border-radius: 10px">
            <SignupForm></SignupForm>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { useUserStore } from 'src/stores/user-store'
import { defineComponent } from 'vue'
// import LoginForm from 'src/components/login_signup/LoginForm.vue'
import { useRouter } from 'vue-router'
import SignupForm from 'src/components/login_signup/SignupForm.vue'
import { useLayoutStore } from 'src/stores/layout-store'

export default defineComponent({
  name: 'IndexPage',
  components: { SignupForm },
  setup () {
    const userStore = useUserStore()
    const router = useRouter()
    const layoutStore = useLayoutStore()

    layoutStore.activeLeftDrawer(false)
    layoutStore.activeRightDrawer(false)

    if (userStore.isLogin) {
      router.push({ name: 'scoreboard' })
    }
    return {
      userStore
    }
  }
})
</script>

<style scoped>
.index-menu:before {
  content: "";
  position: absolute;
  background: rgba(0, 0, 0, 0.5);
  /* top: 0; */
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
