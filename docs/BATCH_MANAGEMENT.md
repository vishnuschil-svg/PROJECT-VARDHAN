# Batch Management

`/chits/batches` manages organizer batches such as Batch A, Batch B, or any local grouping.

## Architecture

- Repository: `src/repositories/BatchRepository.js`
- Service: `src/services/batchService.js`
- UI: `src/pages/chits/Batches.jsx`

## Rules

- Batches are tenant scoped.
- Chit groups can be assigned to one batch record.
- Archiving marks a batch as `ARCHIVED`; it does not delete group data.

## Browser Checks

Open Chits -> Batches, create a batch, assign groups, edit it, and archive it.
