<script setup lang="ts">
import { ref, watch } from "vue";
import {
  FButton,
  FLoader,
  FMessageBox,
  FPersonnummerTextField,
  FStaticField,
  FTextareaField,
  FTooltip,
  FValidationForm,
} from "@fkui/vue";
import { ensureValidatorsRegistered } from "../config/validation";
import { useKompletteringStore } from "../stores/KompletteringStore";
import { fetchKomplettering } from "../utils/fetchKomplettering";
import { fetchUppgiftsbeskrivning } from "../utils/fetchUppgiftsbeskrivning";
import { slutforKomplettering } from "../utils/slutforKomplettering";
import { sparaKomplettering } from "../utils/sparaKomplettering";
import { valideraForKlarmarkering, valideraForSpara } from "../utils/validering";
import { KlarmarkeraResultat } from "../types";
import type { RtfKompletteringData } from "../types";

const UPPGIFTSTYP = "RTF_MANUELL_KOMPLETTERING";

const { handlaggningId } = defineProps<{
  handlaggningId?: string | null;
}>();

ensureValidatorsRegistered();

const store = useKompletteringStore();

const personnummer = ref("");
const avsikt = ref("");
/** The form is shown only once there is real underlag behind it. */
const underlagLaddat = ref(false);
const klar = ref(false);

// FTooltip emits toggle on close as well as on open, so the payload is what
// separates the two — without it a failed fetch is retried on every close, with
// nothing on screen to receive it.
function handleTooltipOpen(event: { isOpen: boolean }): void {
  // Nothing fetched yet, or the last attempt failed — a reopen is a free retry.
  if (!event.isOpen || store.descriptionLoading || store.uppgiftsbeskrivning) {
    return;
  }
  fetchUppgiftsbeskrivning(UPPGIFTSTYP);
}

function formulardata(): RtfKompletteringData {
  return { personnummer: personnummer.value, avsikt: avsikt.value };
}

/**
 * Spara sits outside the form's validation flow: one filled field is enough,
 * because the whole point of Spara is putting half-finished work away.
 */
async function handleSpara(): Promise<void> {
  if (!handlaggningId) {
    return;
  }
  const data = formulardata();
  const valideringsfel = valideraForSpara(data);
  if (valideringsfel) {
    store.error = valideringsfel;
    return;
  }
  await sparaKomplettering(handlaggningId, data);
}

/**
 * Runs on the button's own click, not on form submit.
 *
 * FValidationForm swallows the submit when validation fails, so nothing this
 * component does on @submit can be relied on to report it — and when the host's
 * validators live in a different @fkui/logic instance, FKUI renders no message
 * of its own either. That combination is a Klarmarkera that visibly does
 * nothing. Reporting from the click always reaches the handläggare.
 *
 * Clearing the message when the form passes drops a rejection the handläggare
 * has since acted on; the submit that follows sets its own.
 */
function rapporteraValideringsfel(): void {
  store.error = valideraForKlarmarkering(formulardata());
}

async function handleKlarmarkera(): Promise<void> {
  if (!handlaggningId) {
    return;
  }
  const resultat = await slutforKomplettering(handlaggningId, formulardata());
  klar.value = resultat === KlarmarkeraResultat.KLAR;
}

// Watched rather than loaded once on mount: the store is the host's Pinia
// singleton and outlives any single mount of this remote, so state from a
// previous task would otherwise carry over — a stale `sparad` would make
// Klarmarkera skip the save and complete the next task on data never sent.
// Watching the prop also keeps the form honest if the host swaps tasks in place.
watch(
  () => handlaggningId,
  async (id) => {
    store.$reset();
    klar.value = false;
    underlagLaddat.value = false;
    personnummer.value = "";
    avsikt.value = "";

    if (!id) {
      store.error = "Ingen handläggning angiven. Uppgiften kan inte visas.";
      return;
    }

    const data = await fetchKomplettering(id);
    if (!data) {
      // Leaving the form hidden is the point: an empty form over a failed load
      // would let Spara PATCH two empty strings over whatever the yrkande
      // already holds.
      return;
    }
    personnummer.value = data.personnummer ?? "";
    avsikt.value = data.avsikt ?? "";
    underlagLaddat.value = true;
  },
  { immediate: true },
);
</script>

<template>
  <div class="komplettering">
    <f-static-field>
      <template #label>Komplettera uppgifter för rätt till försäkring</template>
      <template #tooltip>
        <f-tooltip
          screen-reader-text="Läs mer om uppgiften komplettera uppgifter för rätt till försäkring"
          header-tag="h2"
          @toggle="handleTooltipOpen"
        >
          <template #header>
            Läs mer om uppgiften "Komplettera uppgifter för rätt till försäkring"
          </template>
          <template #body>
            <f-loader
              v-if="store.descriptionLoading"
              :show="true"
              :delay="true"
              class="komplettering__loader"
            >
              Vänligen vänta
            </f-loader>
            <span v-else-if="store.uppgiftsbeskrivning">{{ store.uppgiftsbeskrivning }}</span>
            <span v-else-if="store.descriptionError">
              Kunde inte hämta uppgiftsbeskrivningen.
            </span>
            <span v-else>Ingen beskrivning tillgänglig.</span>
          </template>
        </f-tooltip>
      </template>
    </f-static-field>

    <f-loader :show="store.loading" :delay="true" class="komplettering__loader">
      Vänligen vänta
    </f-loader>

    <f-message-box v-if="store.error" type="error" layout="short">
      {{ store.error }}
    </f-message-box>

    <f-message-box v-if="klar" type="success" layout="short">
      Kompletteringen är registrerad och uppgiften är klarmarkerad.
    </f-message-box>

    <f-validation-form
      v-if="underlagLaddat && !klar"
      @submit="handleKlarmarkera"
    >
      <!--
        Complementary guidance only. The prominent summary comes from
        store.error, which is set on the button click, because this slot renders
        only when FKUI's validation is working.
      -->
      <template #error-message>
        <p>Gå till fältet som är markerat.</p>
      </template>

      <f-personnummer-text-field
        v-model="personnummer"
        v-validation.required
        name="personnummer"
        :disabled="store.saving"
        @update:model-value="store.sparad = false"
      >
        <template #default>Personnummer</template>
      </f-personnummer-text-field>

      <f-textarea-field
        v-model="avsikt"
        v-validation.required
        name="avsikt"
        :disabled="store.saving"
        @update:model-value="store.sparad = false"
      >
        <template #default>Avsikt</template>
      </f-textarea-field>

      <!--
        Yields to the error box. Both can be true at once — saving succeeds and
        completing then fails — but "sparade" next to a failure reads as a
        contradiction, and the failure is the part that needs acting on.
      -->
      <f-message-box v-if="store.sparad && !store.error" type="success" layout="short">
        Uppgifterna är sparade.
      </f-message-box>

      <div class="komplettering__buttons">
        <!--
          Spara sits outside the form's validation flow on purpose: the BFF keeps
          registration and completion as separate calls so half-filled work can
          be put away and picked up later. It has a check of its own — see
          handleSpara.
        -->
        <f-button
          type="button"
          variant="secondary"
          size="medium"
          :disabled="store.saving"
          @click="handleSpara"
        >
          Spara
        </f-button>
        <f-button
          type="submit"
          variant="primary"
          size="medium"
          :disabled="store.saving"
          @click="rapporteraValideringsfel"
        >
          Klarmarkera
        </f-button>
      </div>
    </f-validation-form>
  </div>
</template>

<style scoped>
.komplettering__loader {
  margin-top: 2rem !important;
  min-height: 6.25rem;
}

.komplettering__buttons {
  margin-top: 2rem;
  display: flex;
  gap: 0.75rem;
}
</style>
