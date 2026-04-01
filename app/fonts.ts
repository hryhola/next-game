import localFont from 'next/font/local'
import { Gabriela, Handjet, Manrope, Shantell_Sans } from 'next/font/google'

const manrope = Manrope({
    subsets: ['latin', 'cyrillic'],
    variable: '--font-manrope',
    weight: ['400', '500', '600', '700', '800']
})

const handjet = Handjet({
    subsets: ['latin'],
    variable: '--font-handjet',
    weight: ['400', '500', '700']
})

const shantellSans = Shantell_Sans({
    subsets: ['latin', 'cyrillic'],
    variable: '--font-shantell-sans',
    weight: ['400', '500', '700']
})

const gabriela = Gabriela({
    subsets: ['latin', 'cyrillic'],
    variable: '--font-gabriela',
    weight: ['400']
})

const cyrillicOldA = localFont({
    src: '../public/fonts/cyrillicolda_bold.ttf',
    variable: '--font-cyrillic-old-a',
    display: 'swap'
})

export const appFontVariables = [manrope.variable, handjet.variable, shantellSans.variable, gabriela.variable, cyrillicOldA.variable].join(' ')
