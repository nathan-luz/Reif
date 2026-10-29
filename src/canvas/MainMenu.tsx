import {
  DefaultMainMenu,
  DefaultMainMenuContent,
  TldrawUiMenuCheckboxItem,
  TldrawUiMenuGroup,
  TldrawUiMenuSubmenu,
  useValue,
} from 'tldraw'
import { designSystemId, setDesignSystem } from '../design-system/state'
import { DESIGN_SYSTEMS } from '../shared/design-systems'

function DesignSystemSubmenu() {
  const current = useValue(designSystemId)
  return (
    <TldrawUiMenuSubmenu id="reif-design-system" label="reif.design-system">
      {DESIGN_SYSTEMS.map((ds) => (
        <TldrawUiMenuCheckboxItem
          key={ds.id}
          id={`reif-ds-${ds.id}`}
          label={`reif.ds.${ds.id}`}
          checked={current === ds.id}
          toggle
          onSelect={() => setDesignSystem(ds.id)}
        />
      ))}
    </TldrawUiMenuSubmenu>
  )
}

export function MainMenu() {
  return (
    <DefaultMainMenu>
      <DefaultMainMenuContent />
      <TldrawUiMenuGroup id="reif-design-system-group">
        <DesignSystemSubmenu />
      </TldrawUiMenuGroup>
    </DefaultMainMenu>
  )
}
