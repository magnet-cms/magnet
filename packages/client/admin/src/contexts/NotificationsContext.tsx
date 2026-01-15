import React, { createContext, useContext, useState, useCallback } from 'react'

interface NotificationsContextType {
	isOpen: boolean
	open: () => void
	close: () => void
	toggle: () => void
}

const NotificationsContext = createContext<
	NotificationsContextType | undefined
>(undefined)

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isOpen, setIsOpen] = useState(false)

	const open = useCallback(() => setIsOpen(true), [])
	const close = useCallback(() => setIsOpen(false), [])
	const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

	return (
		<NotificationsContext.Provider value={{ isOpen, open, close, toggle }}>
			{children}
		</NotificationsContext.Provider>
	)
}

export const useNotifications = (): NotificationsContextType => {
	const context = useContext(NotificationsContext)
	if (context === undefined) {
		throw new Error(
			'useNotifications must be used within a NotificationsProvider',
		)
	}
	return context
}
