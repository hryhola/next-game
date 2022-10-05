interface Props {
    components: Array<React.JSXElementConstructor<React.PropsWithChildren<any>>>
    children: React.ReactNode
}

export const ContextComposer: React.FC<Props> = props => {
    const { components = [], children } = props

    return (
        <>
            {components.reduceRight((inner, Component) => {
                return <Component>{inner}</Component>
            }, children)}
        </>
    )
}
