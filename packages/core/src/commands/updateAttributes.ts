import { MarkType, NodeType } from '@tiptap/pm/model'

import { getMarkType } from '../helpers/getMarkType.js'
import { getNodeType } from '../helpers/getNodeType.js'
import { getSchemaTypeNameByName } from '../helpers/getSchemaTypeNameByName.js'
import { RawCommands } from '../types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    updateAttributes: {
      /**
       * Update attributes of a node or mark.
       * @param typeOrName The type or name of the node or mark.
       * @param attributes The attributes of the node or mark.
       * @example editor.commands.updateAttributes('mention', { userId: "2" })
       */
      updateAttributes: (
        /**
         * The type or name of the node or mark.
         */
        typeOrName: string | NodeType | MarkType,

        /**
         * The attributes of the node or mark.
         */
        attributes: Record<string, any>,
      ) => ReturnType
    }
  }
}

export const updateAttributes: RawCommands['updateAttributes'] =
  (typeOrName, attributes = {}) =>
  ({ tr, state, dispatch }) => {
    let nodeType: NodeType | null = null
    let markType: MarkType | null = null

    const schemaType = getSchemaTypeNameByName(
      typeof typeOrName === 'string' ? typeOrName : typeOrName.name,
      state.schema,
    )

    if (!schemaType) {
      return false
    }

    if (schemaType === 'node') {
      nodeType = getNodeType(typeOrName as NodeType, state.schema)
    }

    if (schemaType === 'mark') {
      markType = getMarkType(typeOrName as MarkType, state.schema)
    }

    if (dispatch) {
      tr.selection.ranges.forEach(range => {
        const from = range.$from.pos
        const to = range.$to.pos

        state.doc.nodesBetween(from, to, (node, pos) => {
          if (nodeType && nodeType === node.type) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              ...attributes,
            })
          }

          if (markType && node.marks.length) {
            node.marks.forEach(mark => {
              if (markType === mark.type) {
                const trimmedFrom = Math.max(pos, from)
                const trimmedTo = Math.min(pos + node.nodeSize, to)

                tr.addMark(
                  trimmedFrom,
                  trimmedTo,
                  markType.create({
                    ...mark.attrs,
                    ...attributes,
                  }),
                )
              }
            })
          }
        })
      })
    }

    return true
  }
