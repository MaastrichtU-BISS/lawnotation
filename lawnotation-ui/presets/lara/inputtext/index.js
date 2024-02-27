export default {
    root: ({ instance, state }) => ({
        class: [
            // Font
            "font-sans leading-none",
            { " px-3 pb-3 pt-5": instance.$attrs.mode === "filled" },
            { " px-3 pb-4 pt-4": instance.$attrs.mode !== "filled" },

            // Colors
            {
                "text-surface-600 dark:text-surface-200 border-b-2 border-primary-400 dark:border-primary-400/60 rounded-none":
                    instance.$attrs.mode === "filled",
            },
            {
                "text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg":
                    instance.$attrs.mode !== "filled",
            },

            // States
            {
                "hover:border-primary-500 dark:hover:border-primary-400":
                    !state.disabled,
                "focus:outline-none focus:border-primary-600 dark:focus:border-primary-300":
                    !state.disabled,
                "opacity-60 select-none pointer-events-none cursor-default":
                    state.disabled,
            },

            // Misc
            "transition-colors duration-200",
        ],
    }),
};
