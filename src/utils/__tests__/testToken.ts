/**
 * The token the suite runs as. test-setup.ts puts it in the store before every
 * test and montera() passes it as the portal would, so a test that is not
 * about the token never has to mention it.
 */
export const TOKEN = "Bearer 1:test-handlaggare";
