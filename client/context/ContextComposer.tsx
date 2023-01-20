interface Props {
    components: Array<React.JSXElementConstructor<React.PropsWithChildren<any>>>
    children: React.ReactNode
    props: Record<string, any>
}

export const ContextComposer: React.FC<Props> = props => {
    const { components = [], children } = props

    return (
        <>
            {components.reduceRight((inner, Component) => {
                return <Component {...props.props}>{inner}</Component>
            }, children)}
        </>
    )
}
