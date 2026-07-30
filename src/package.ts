import { linkedPackage } from '@_linked/core/utils/Package';

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

export const packageName = registration.packageName;
