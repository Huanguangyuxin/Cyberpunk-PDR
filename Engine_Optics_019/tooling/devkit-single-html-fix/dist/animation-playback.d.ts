import type { AnimationPlaybackOptions } from '@forgeax/engine-animation';
/** Transport the existing Animation assembly choice; App owns its installation. */
export declare const animationPlaybackSchema: {
    type: "object";
    additionalProperties: false;
    properties: {
        cadence: {
            enum: string[];
        };
    };
};
export declare function animationPlayback(value: unknown): AnimationPlaybackOptions;
export declare function environmentAnimationPlayback(): AnimationPlaybackOptions;
//# sourceMappingURL=animation-playback.d.ts.map