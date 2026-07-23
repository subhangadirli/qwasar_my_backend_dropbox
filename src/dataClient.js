import { generateClient } from 'aws-amplify/data'

// Single AppSync/DynamoDB client shared across the app.
// Untyped on purpose: the frontend is plain JS, so we skip the generated
// Schema type and rely on the model names defined in amplify/data/resource.ts.
export const client = generateClient()
