/**
 * @name plugin example
 * @param option: { data, filePath, config }
 * - data: module and generate code Data
 * - filePath: Pull file storage directory
 * - config: cli config
 */

const fs = require('fs')
const { unique, downloadImg } = require('@imgcook/cli-utils')
const chalk = require('chalk')
const oss = require('ali-oss')
const { options } = require('yargs')

let ossClient

const createOssClient = function (option) {
  !ossClient && (ossClient = new oss(option))
}

const uploadData = async (file, filepath, option) => {
  let result = await client.put(`/static/` + filepath, file)
  return result
}

const pluginHandler = async (option) => {
  if (!option.config.oss) {
    throw new Error('option.oss is not defined')
  }
  createOssClient(option.config.oss)
  let imgArr = []
  let { data } = option
  const { filePath, config } = option
  if (!data.code) return null
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath)
  }
  const panelDisplay = data.code.panelDisplay || []
  const moduleData = data.moduleData
  let index = 0
  for (const item of panelDisplay) {
    let fileValue = item.panelValue

    imgArr = fileValue.match(
      /(https?):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|](\.png|\.jpg)/g
    )
    if (imgArr && imgArr.length > 0) {
      imgArr = unique(imgArr)
      const imgPath = `${filePath}/wyq`
      let imgObj = []
      const imgrc = `${imgPath}/.imgrc`
      if (fs.existsSync(imgrc)) {
        let imgConfig = fs.readFileSync(imgrc, 'utf8')
        imgObj = JSON.parse(imgConfig) || []
      }
      for (let idx = 0; idx < imgArr.length; idx++) {
        if (!fs.existsSync(imgPath)) {
          fs.mkdirSync(imgPath)
        }
        let suffix = imgArr[idx].split('.')
        suffix = suffix[suffix.length - 1]
        const imgName = `img_${moduleData.id}_${index}_${idx}.${suffix}`
        const imgPathItem = `${imgPath}/${imgName}`
        let curImgObj = {}
        for (const item of imgObj) {
          if (item.imgUrl === imgArr[idx]) {
            curImgObj = item
          }
        }
        const reg = new RegExp(imgArr[idx], 'g')
        if (!curImgObj.imgPath) {
          await downloadImg(imgArr[idx], imgPathItem)
          let newImgUrl = ''
          if (
            option.config &&
            option.config.oss &&
            option.config.oss !== 'undefined'
          ) {
            const udata = await uploadData(imgPathItem, option.config)
            fileValue = fileValue.replace(reg, udata.url)
            newImgUrl = udata.url
          } else if (moduleData && moduleData.dsl === 'react-taobao-standard') {
            // If the local path image is referenced under the react standard, use the require reference
            const regex = new RegExp(`"${imgArr[idx]}"`, 'g')
            fileValue = fileValue.replace(regex, `require('./wyq/${imgName}')`)
          } else {
            fileValue = fileValue.replace(reg, `./wyq/${imgName}`)
          }
          imgObj.push({
            newImgUrl,
            imgUrl: imgArr[idx],
            imgPath: `./wyq/${imgName}`,
          })
        } else {
          if (
            option.config &&
            option.config.oss &&
            option.config.oss !== 'undefined'
          ) {
            fileValue = fileValue.replace(reg, curImgObj.newImgUrl)
          } else {
            fileValue = fileValue.replace(reg, curImgObj.imgPath)
          }
        }
      }
      if (imgObj.length > 0) {
        fs.writeFileSync(imgrc, JSON.stringify(imgObj), 'utf8')
      }
    }
    item.panelValue = fileValue
    index++
  }
  let result = {}
  console.log('data: ', data.code.panelDisplay);
  return { data, filePath, config, result }
}

module.exports = (...args) => {
  return pluginHandler(...args).catch((err) => {
    console.log(err)
  })
}
