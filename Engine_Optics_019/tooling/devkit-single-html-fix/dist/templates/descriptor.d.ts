export interface TemplateDescriptor {
    readonly id: string;
    readonly purpose: string;
    readonly defaultIdentity: {
        readonly name: string;
        readonly packageName: string;
    };
    readonly journeys: readonly string[];
}
type TemplateDescriptorError = {
    readonly code: 'template-invalid' | 'template-journey-missing';
    readonly expected: string;
    readonly hint: string;
    readonly detail: {
        readonly id?: string;
    };
};
export type TemplateValidation = {
    readonly ok: true;
    readonly value: TemplateDescriptor;
} | {
    readonly ok: false;
    readonly error: TemplateDescriptorError;
};
export declare function validateTemplateDescriptor(value: unknown): TemplateValidation;
export {};
//# sourceMappingURL=descriptor.d.ts.map