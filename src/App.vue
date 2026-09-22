<script setup lang="ts">
import { FLayoutApplicationTemplate, FLayoutLeftPanel, FPageHeader } from "@fkui/vue";
import RtfKomplettering from "./components/RtfKomplettering.vue";
import { env } from "./config/env";

const props = defineProps<{
  handlaggningId?: string | null;
}>();

const isDev = import.meta.env.DEV;

// Standalone dev has no host to pass the id, so fall back to VITE_DEV_HANDLAGGNING_ID.
const handlaggningId = props.handlaggningId || env.devHandlaggningId;
</script>

<template>
  <f-layout-application-template v-if="isDev">
    <template #header>
      <f-page-header />
    </template>
    <f-layout-left-panel>
      <RtfKomplettering :handlaggning-id="handlaggningId" />
    </f-layout-left-panel>
  </f-layout-application-template>
  <RtfKomplettering v-else :handlaggning-id="handlaggningId" />
</template>

<style scoped></style>
