import { defineStore } from "pinia";

/**
 * Shared status between the component and the call helpers. The form's own
 * field values are not here: they belong to the component that edits them.
 *
 * Pinia options state is writable directly, so there are no pass-through
 * setters — helpers assign the fields they own.
 */
export const useKompletteringStore = defineStore("KompletteringStore", {
  state: () => ({
    loading: false,
    saving: false,
    error: null as string | null,
    /** Set by a successful PATCH, cleared as soon as the form is edited again. */
    sparad: false,
    uppgiftsbeskrivning: "",
    descriptionLoading: false,
    descriptionError: false,
    /**
     * The logged-in handläggare's full Authorization header value, from the
     * portal (PORT-FR-03.6), or null. Set by RtfKomplettering.vue; read by
     * bffClient. Cleared by `$reset()` like everything else, so the component
     * sets it again after each reset.
     */
    authorization: null as string | null,
  }),
});
