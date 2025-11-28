import { expect } from 'chai'
import { network } from 'hardhat'

const { ethers } = await network.connect()

describe('MintableERC20', function () {
	// Test deployment and initial state
	describe('Deployment', function () {
		it('Should deploy with correct name and symbol', async function () {
			const token = await ethers.deployContract('MintableERC20', [
				'Alpha',
				'ALPHA',
			])

			// return new ethers.Contract(address, mintableERC20.abi, provider.getSigner());

			// const [signer] = await ethers.getSigners();

			// const token = await ethers.getContractAt(
			//     "MintableERC20", "0xc01Ee7f10EA4aF4673cFff62710E1D7792aBa8f3", signer);

			expect(await token.name()).to.equal('Alpha')
			expect(await token.symbol()).to.equal('ALPHA')
			expect(await token.decimals()).to.equal(18)
		})

		it('Should mint 100,000 tokens to deployer on deployment', async function () {
			const [owner] = await ethers.getSigners()
			const token = await ethers.deployContract('MintableERC20', [
				'Alpha',
				'ALPHA',
			])

			const expectedBalance = ethers.parseEther('100000')
			expect(await token.balanceOf(owner.address)).to.equal(
				expectedBalance
			)
		})

		it('Should set the deployer as owner', async function () {
			const [owner] = await ethers.getSigners()
			const token = await ethers.deployContract('MintableERC20', [
				'Alpha',
				'ALPHA',
			])

			expect(await token.owner()).to.equal(owner.address)
		})

		it('Should set interval to 3600 seconds (1 hour)', async function () {
			const token = await ethers.deployContract('MintableERC20', [
				'Alpha',
				'ALPHA',
			])

			expect(await token.interval()).to.equal(3600n)
		})
	})
})
