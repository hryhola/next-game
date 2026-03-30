'use client'

import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger
export const AlertDialogPortal = AlertDialogPrimitive.Portal
export const AlertDialogOverlay = DialogOverlay

export const AlertDialogContent = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>((props, ref) => (
    <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogPrimitive.Content asChild>
            <DialogContent ref={ref} hideClose {...props} />
        </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
))

AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

export const AlertDialogHeader = DialogHeader
export const AlertDialogFooter = DialogFooter
export const AlertDialogTitle = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>((props, ref) => (
    <AlertDialogPrimitive.Title asChild>
        <DialogTitle ref={ref} {...props} />
    </AlertDialogPrimitive.Title>
))

AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

export const AlertDialogDescription = React.forwardRef<
    React.ElementRef<typeof AlertDialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>((props, ref) => (
    <AlertDialogPrimitive.Description asChild>
        <DialogDescription ref={ref} {...props} />
    </AlertDialogPrimitive.Description>
))

AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

export const AlertDialogAction = AlertDialogPrimitive.Action
export const AlertDialogCancel = AlertDialogPrimitive.Cancel
