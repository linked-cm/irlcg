import { linkedPackage } from '@_linked/core/utils/Package';
import { createLinkedComponentFn } from '@_linked/react/utils/LinkedComponent';

export const irlcgPackageName = '@_linked/irlcg' as const;
export const irlcgPackageBaseUri = 'https://linked.cm/' as const;

const registration = linkedPackage(irlcgPackageName, {
  baseUri: irlcgPackageBaseUri,
});

export const {
  getPackageShape,
  linkedOntology,
  linkedShape,
  linkedUtil,
  packageExports,
  packageMetadata,
  registerPackageExport,
  registerPackageModule,
} = registration;

const linkedComponent = createLinkedComponentFn(
  registerPackageExport,
  () => {},
);

export const packageName = registration.packageName;
export { linkedComponent };
