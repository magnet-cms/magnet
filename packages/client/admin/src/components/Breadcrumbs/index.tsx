import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@magnet-cms/ui/components/atoms'
import { names } from '@magnet-cms/utils'
import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Breadcrumbs = () => {
	const location = useLocation()
	const pathnames = location.pathname.split('/').filter(Boolean)

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link to="/">Home</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>

				{pathnames.map((name, index) => {
					const to = `/${pathnames.slice(0, index + 1).join('/')}`
					const isLast = index === pathnames.length - 1
					const cName = names(name)

					return (
						<Fragment key={to}>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage>
										{decodeURIComponent(cName.title)}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild>
										<Link to={to}>{decodeURIComponent(cName.title)}</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</Fragment>
					)
				})}
			</BreadcrumbList>
		</Breadcrumb>
	)
}
