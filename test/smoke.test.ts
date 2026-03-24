describe('test harness', () => {
  it('boots jsdom for browser-facing tests', () => {
    const element = document.createElement('div')

    expect(element.nodeName).toBe('DIV')
  })
})
