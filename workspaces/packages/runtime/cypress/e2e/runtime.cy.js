const services = [
  { name: 'landing', url: 'http://landing:3000' },
  { name: 'console', url: 'http://console:3001' },
  { name: 'onboarding', url: 'http://onboarding:3002' },
  { name: 'mobile', url: 'http://mobile:3003' }
]

describe('Amarelo Kubernetes runtime', () => {
  for (const service of services) {
    it(`${service.name} responds through its ClusterIP Service`, () => {
      cy.request({
        failOnStatusCode: false,
        retryOnNetworkFailure: true,
        retryOnStatusCodeFailure: true,
        url: service.url
      }).then((response) => {
        expect(response.status, service.name).to.be.within(200, 399)
      })
    })
  }
})
