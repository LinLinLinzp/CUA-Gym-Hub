export const roles = {
  'roles/viewer': 'Viewer',
  'roles/editor': 'Editor',
  'roles/compute.instanceAdmin.v1': 'Compute Instance Admin (v1)',
  'roles/storage.admin': 'Storage Admin',
  'roles/storage.objectViewer': 'Storage Object Viewer',
  'roles/billing.viewer': 'Billing Viewer',
}
export const principalTypes = { user: 'User', group: 'Group', serviceAccount: 'Service account' }
export const zones = {
  'us-central1': ['us-central1-a', 'us-central1-b', 'us-central1-c'],
  'us-east1': ['us-east1-b', 'us-east1-c', 'us-east1-d'],
  'europe-west1': ['europe-west1-b', 'europe-west1-c', 'europe-west1-d'],
}
export const machines = ['e2-micro', 'e2-small', 'e2-medium', 'e2-standard-2', 'e2-standard-4', 'e2-standard-8']
export const images = { 'debian-12': 'Debian 12', 'ubuntu-2404-lts': 'Ubuntu 24.04 LTS' }
export const locations = {
  region: ['us-central1', 'us-east1', 'europe-west1'],
  'dual-region': ['nam4', 'eur4'],
  'multi-region': ['us', 'eu', 'asia'],
}
export const locationTypes = { region: 'Region', 'dual-region': 'Dual-region', 'multi-region': 'Multi-region' }
export const classes = { STANDARD: 'Standard', NEARLINE: 'Nearline', COLDLINE: 'Coldline', ARCHIVE: 'Archive' }
export const accessModes = { uniform: 'Uniform', 'fine-grained': 'Fine-grained' }
export const vmStatuses = { RUNNING: 'Running', TERMINATED: 'Stopped', DELETED: 'Deleted' }
export const services = ['Compute Engine', 'Cloud Storage', 'Cloud Logging', 'Virtual Private Cloud']
