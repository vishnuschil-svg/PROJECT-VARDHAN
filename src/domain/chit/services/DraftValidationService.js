/**
 * Backward-compatible import path. The validation implementation lives only at
 * domain/chit/validation/ValidationService.js.
 */
import {
  validateDraft,
  VALIDATION_STATUS,
} from "../validation/ValidationService.js";

export const VALIDATION_RESULT = VALIDATION_STATUS;

export const DraftValidationService = Object.freeze({
  validate: validateDraft,
});

export { validateDraft, VALIDATION_STATUS };
export default DraftValidationService;
