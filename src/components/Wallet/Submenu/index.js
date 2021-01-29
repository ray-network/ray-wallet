import React from 'react'
import { NavLink, useRouteMatch } from 'react-router-dom'

const WalletSubmenu = () => {
  const { url } = useRouteMatch()

  return (
    <div>
      <div className="ray__submenu">
        <NavLink exact activeClassName="ray__submenu__item--active" to={`${url}/send`}>
          <span>Send</span>
          <span>Send</span>
        </NavLink>
        <NavLink exact activeClassName="ray__submenu__item--active" to={`${url}/addresses`}>
          <span>Receive</span>
          <span>Receive</span>
        </NavLink>
        <NavLink exact activeClassName="ray__submenu__item--active" to={`${url}/transactions`}>
          <span>Transactions (3)</span>
          <span>Transactions (3)</span>
        </NavLink>
      </div>
    </div>
  )
}

export default WalletSubmenu