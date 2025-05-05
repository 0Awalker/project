import { IsNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'
export class PostDto {
    @IsNotEmpty({message: "设备类型不能为空"})
    @Transform(post => {if(post.value) return post.value.trim()})
    type: string
    
    @IsNotEmpty({message: "设备名称不能为空"})
    @Transform(post => {if(post.value) return post.value.trim()})
    deviceName: string

    @Transform(post => {if(post.value) return post.value.trim()})
    sn: string

    @Transform(post => {if(post.value) return post.value.trim()})
    assets_tag: string

    @IsNotEmpty({message: "数量不能为空"})
    // @Transform(post => post.value.trim())
    number: number
}

export class TypeDto {
    @IsNotEmpty({message: ""})
    @Transform(post => {if(post.value) return post.value.trim()})
    label: string
    
    @IsNotEmpty({message: ""})
    @Transform(post => {if(post.value) return post.value.trim()})
    value: string
}